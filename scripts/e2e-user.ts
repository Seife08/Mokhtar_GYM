// Create a temporary E2E test user, then clean up after the browser test.
// Usage: bun scripts/e2e-user.ts create|cleanup
import { scryptSync, randomBytes } from "crypto"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../src/generated/prisma/client"

const url = process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db"
const db = new PrismaClient({
  adapter: new PrismaLibSql({ url }),
  log: ["error", "warn"],
})

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex")
  const hash = scryptSync(password, salt, 64).toString("hex")
  return `scrypt$${salt}$${hash}`
}

const EMAIL = "e2e-test@mokhtargym.dz"
const PASS = "TestE2E@2026"

async function create() {
  await db.user.deleteMany({ where: { email: EMAIL } })
  const user = await db.user.create({
    data: {
      email: EMAIL,
      passwordHash: hashPassword(PASS),
      role: "CLIENT",
      status: "ACTIVE",
      onboarding: true,
      firstName: "E2E",
      lastName: "Tester",
      emailVerifiedAt: new Date(),
    },
  })
  console.log("CREATED:", user.id, EMAIL, "| password:", PASS)
}

async function cleanup() {
  const u = await db.user.findFirst({ where: { email: EMAIL } })
  if (!u) return console.log("already clean")
  await db.notification.deleteMany({ where: { userId: u.id } })
  await db.attendance.deleteMany({ where: { userId: u.id } })
  await db.user.delete({ where: { id: u.id } })
  console.log("CLEANED:", u.id)
}

const cmd = process.argv[2]
;(cmd === "cleanup" ? cleanup() : create())
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
