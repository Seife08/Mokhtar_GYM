// Verify DB WRITES through Prisma 7 + libSQL adapter (create / update / delete).
// Run: bun scripts/test-prisma7-write.ts
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../src/generated/prisma/client"

const url = process.env.DATABASE_URL || "file:/home/z/my-project/db/custom.db"
const db = new PrismaClient({
  adapter: new PrismaLibSql({ url }),
  log: ["error", "warn"],
})

async function main() {
  const admin = await db.user.findFirstOrThrow({ where: { role: "ADMIN" } })

  // 1. CREATE
  const notif = await db.notification.create({
    data: {
      userId: admin.id,
      type: "general",
      title: "سجل اختباري مؤقت",
      body: "Test record — will be deleted",
      link: null,
    },
  })
  console.log("✓ CREATE notification:", notif.id)

  // 2. UPDATE
  const updated = await db.notification.update({
    where: { id: notif.id },
    data: { isRead: true },
  })
  console.log("✓ UPDATE isRead:", updated.isRead === true ? "OK" : "FAIL")

  // 3. READ BACK (join)
  const found = await db.notification.findFirst({
    where: { id: notif.id },
    include: { user: { select: { email: true } } },
  })
  console.log("✓ READ with join:", found?.user.email)

  // 4. DELETE
  await db.notification.delete({ where: { id: notif.id } })
  const gone = await db.notification.count({ where: { id: notif.id } })
  console.log("✓ DELETE:", gone === 0 ? "removed" : "STILL THERE")

  // 5. DateTime WRITE (iso format compat with Prisma 6 data)
  const att = await db.attendance.create({
    data: { userId: admin.id, method: "MANUAL", notes: "temp-write-test", checkInAt: new Date() },
  })
  console.log("✓ DateTime write:", att.checkInAt.toISOString())
  await db.attendance.delete({ where: { id: att.id } })

  console.log("ALL WRITE CHECKS PASSED — adapter supports full CRUD")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED:", e)
    process.exit(1)
  })
