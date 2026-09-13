import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { attendanceStreak } from "@/lib/membership";
import { AttendanceClient } from "@/components/client/attendance-client";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const me = await requireClient();
  if (!me) return null;

  const records = await db.attendance.findMany({
    where: { userId: me.id },
    orderBy: { checkInAt: "desc" },
    take: 90,
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const visitsThisMonth = records.filter((r) => r.checkInAt >= monthStart).length;
  const streak = attendanceStreak(records.map((r) => r.checkInAt));

  // heatmap: last 12 weeks × 7 days
  const visitsByDay = new Set(
    records.map((r) => new Date(r.checkInAt).toDateString())
  );

  return (
    <AttendanceClient
      records={records.map((r) => ({
        id: r.id,
        checkInAt: r.checkInAt.toISOString(),
        checkOutAt: r.checkOutAt?.toISOString() ?? null,
        method: r.method,
      }))}
      visitsThisMonth={visitsThisMonth}
      streak={streak}
      visitDays={[...visitsByDay]}
      totalVisits={records.length}
    />
  );
}
