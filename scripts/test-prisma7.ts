// Verify Prisma 7 + libSQL driver adapter against the existing SQLite file.
// Run: bun scripts/test-prisma7.ts
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../src/generated/prisma/client"

const url = process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db"
console.log("URL:", url)

const db = new PrismaClient({
  adapter: new PrismaLibSql({ url }),
  log: ["error", "warn"],
})

async function main() {
  const users = await db.user.count()
  const admins = await db.user.count({ where: { role: "ADMIN" } })
  const memberships = await db.membership.count()
  const payments = await db.payment.count()
  const plans = await db.membershipPlan.count()
  const gymSettings = await db.gymSettings.findFirst()
  const admin = await db.user.findFirst({
    where: { email: "admin@mokhtargym.dz" },
    select: { email: true, role: true, firstName: true },
  })

  console.log("✓ users:", users)
  console.log("✓ admins:", admins)
  console.log("✓ memberships:", memberships)
  console.log("✓ payments:", payments)
  console.log("✓ plans:", plans)
  console.log("✓ gymSettings:", gymSettings?.gymName ?? "(none)")
  console.log("✓ admin login:", JSON.stringify(admin))

  // exercise a relational query (joins through the adapter)
  const withPayments = await db.user.findMany({
    where: { payments: { some: {} } },
    select: { email: true, _count: { select: { payments: true, memberships: true } } },
    take: 3,
  })
  console.log("✓ relational query:", JSON.stringify(withPayments))

  // exercise DateTime reading (SQLite stores TEXT dates)
  const recent = await db.attendance.findMany({
    orderBy: { checkInAt: "desc" },
    take: 2,
    select: { checkInAt: true, method: true },
  })
  console.log("✓ attendance dates:", JSON.stringify(recent))
}

main()
  .then(() => {
    console.log("ALL PRISMA 7 + LIBSQL CHECKS PASSED")
    process.exit(0)
  })
  .catch((e) => {
    console.error("FAILED:", e)
    process.exit(1)
  })
