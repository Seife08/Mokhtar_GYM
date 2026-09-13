import { PrismaClient } from "@/generated/prisma/client"
import { PrismaLibSql } from "@prisma/adapter-libsql"

/**
 * Single Prisma entry point for every deployment target:
 *  · local / VPS       → DATABASE_URL=file:/…/db/custom.db   (plain SQLite file)
 *  · Turso / Vercel    → DATABASE_URL=libsql://… + DATABASE_AUTH_TOKEN
 * Both paths go through the libSQL driver adapter, so the app code and the
 * database file/format are identical everywhere (SQLite dialect).
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createDb(): PrismaClient {
  const url = process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db"
  const isRemote = /^libsql:|^https?:\/\//i.test(url)

  return new PrismaClient({
    adapter: new PrismaLibSql({
      url,
      authToken: isRemote ? process.env.DATABASE_AUTH_TOKEN : undefined,
    }),
    log: ["query", "error", "warn"],
  })
}

export const db = globalForPrisma.prisma ?? createDb()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
