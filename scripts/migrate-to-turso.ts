/**
 * MOKHTAR GYM — full migration of the local SQLite database to Turso.
 *
 * Usage (run from the project root, after creating the Turso DB):
 *   TURSO_DATABASE_URL="libsql://your-db.turso.io" \
 *   TURSO_AUTH_TOKEN="eyJhbGciOi..." \
 *   bun scripts/migrate-to-turso.ts
 *
 * What it does (safe to re-run — it rebuilds the remote from scratch):
 *   0. Reads the full schema (tables + indexes + triggers) from the local file
 *   1. Drops the remote tables, re-creates the schema (exact clone of local)
 *   2. Copies all rows in parameterized batches (500 statements per batch)
 *   3. Re-creates indexes and triggers AFTER the data (triggers never fire
 *      during the copy)
 *   4. Verifies row counts table-by-table and prints a report
 *
 * Works against any libSQL target — a Turso URL (libsql://) or a local file
 * (file:./db/test.db), which is how the script logic was validated.
 */
import { createClient } from "@libsql/client"
import { Database } from "bun:sqlite"

const LOCAL_URL = process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db"
const LOCAL_FILE = LOCAL_URL.replace(/^file:/, "")
const REMOTE_URL = process.env.TURSO_DATABASE_URL
const REMOTE_TOKEN = process.env.TURSO_AUTH_TOKEN

if (!REMOTE_URL) {
  console.error(
    "Missing TURSO_DATABASE_URL.\n" +
      "Example: TURSO_DATABASE_URL='libsql://mokhtar-myorg.turso.io' TURSO_AUTH_TOKEN='eyJ...' bun scripts/migrate-to-turso.ts"
  )
  process.exit(1)
}

const local = new Database(LOCAL_FILE, { readonly: true })
const remote = createClient({
  url: REMOTE_URL,
  authToken: REMOTE_TOKEN || undefined,
})

type Row = Record<string, unknown>

async function softPragma(sql: string) {
  // Turso may reject some PRAGMAs over the wire — never fatal.
  try {
    await remote.execute(sql)
  } catch {
    /* ignored on purpose */
  }
}

function tablesOf(db: Database): string[] {
  return db
    .query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY rowid")
    .all()
    .map((r) => String((r as Row).name))
}

function ddlOf(db: Database, type: "index" | "trigger"): string[] {
  return db
    .query("SELECT sql FROM sqlite_master WHERE type=? AND sql IS NOT NULL ORDER BY rowid")
    .all(type)
    .map((r) => String((r as Row).sql))
    .filter((s) => s.trim().length > 0)
}

function columnsOf(db: Database, table: string): string[] {
  return db.query(`PRAGMA table_info("${table}")`).all().map((r) => String((r as Row).name))
}

function countIn(db: Database, table: string): number {
  return Number(db.query(`SELECT COUNT(*) AS c FROM "${table}"`).get()!.c)
}

/** libSQL Value: null | number | bigint | string | ArrayBuffer | Uint8Array */
function argOf(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString()
  return v
}

async function main() {
  const tables = tablesOf(local)
  const indexDdl = ddlOf(local, "index")
  const triggerDdl = ddlOf(local, "trigger")

  console.log(`Local file : ${LOCAL_FILE}`)
  console.log(`Remote     : ${REMOTE_URL}`)
  console.log(`Tables (${tables.length}) : ${tables.join(", ")}`)
  console.log(`Indexes: ${indexDdl.length} | Triggers: ${triggerDdl.length}\n`)

  // ── 1. rebuild the remote schema (drop + create, exact clone) ──
  await softPragma("PRAGMA foreign_keys=OFF")
  for (const t of [...tables].reverse()) {
    await remote.execute(`DROP TABLE IF EXISTS "${t}"`)
  }
  for (const t of tables) {
    const ddl = String(
      local.query('SELECT sql FROM sqlite_master WHERE type="table" AND name=?').get(t)!.sql
    )
    await remote.execute(ddl)
  }
  console.log("✓ Remote schema re-created (identical to local)\n")

  // ── 2. copy rows in parameterized batches ──
  let totalRows = 0
  for (const t of tables) {
    const cols = columnsOf(local, t)
    const colList = cols.map((c) => `"${c}"`).join(", ")
    const placeholders = cols.map(() => "?").join(",")
    const sql = `INSERT INTO "${t}" (${colList}) VALUES (${placeholders})`
    const rows = local.query(`SELECT ${colList} FROM "${t}"`).all() as Row[]

    const BATCH = 500
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH)
      await remote.batch(
        chunk.map((r) => ({
          sql,
          args: cols.map((c) => argOf(r[c])),
        }))
      )
    }
    totalRows += rows.length
    console.log(`  ✓ ${t.padEnd(24)} ${String(rows.length).padStart(6)} rows`)
  }

  // ── 3. indexes & triggers after the data ──
  for (const ddl of indexDdl) await remote.execute(ddl)
  for (const ddl of triggerDdl) await remote.execute(ddl)
  console.log(`\n✓ ${indexDdl.length} indexes + ${triggerDdl.length} triggers re-created`)
  await softPragma("PRAGMA foreign_keys=ON")

  // ── 4. verify row counts ──
  console.log("\nVerification (local → remote):")
  let mismatch = 0
  for (const t of tables) {
    const localCount = countIn(local, t)
    const res = await remote.execute(`SELECT COUNT(*) AS c FROM "${t}"`)
    const remoteCount = Number((res.rows[0] as Row).c)
    const ok = localCount === remoteCount
    if (!ok) mismatch++
    console.log(`  ${ok ? "✓" : "✗"} ${t.padEnd(24)} ${localCount} → ${remoteCount}`)
  }

  if (mismatch > 0) {
    console.error(`\nMIGRATION INCOMPLETE — ${mismatch} table(s) mismatched.`)
    process.exit(1)
  }
  console.log(`\nMIGRATION OK — ${totalRows} rows across ${tables.length} tables copied to ${REMOTE_URL}`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("MIGRATION FAILED:", e)
    process.exit(1)
  })
