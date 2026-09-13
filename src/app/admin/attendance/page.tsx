import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { headers } from "next/headers";
import { AttendanceClient } from "@/components/admin/attendance-client";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  // NFC gate URL (computed server-side — the tag at the door points here)
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") ?? "http";
  const nfcGateUrl = `${proto}://${host}/checkin`;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart.getTime() - 6 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayRecords, weekCount, monthCount, clients, settings] = await Promise.all([
    db.attendance.findMany({
      where: { checkInAt: { gte: todayStart } },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true } } },
      orderBy: { checkInAt: "desc" },
    }),
    db.attendance.count({ where: { checkInAt: { gte: weekStart } } }),
    db.attendance.count({ where: { checkInAt: { gte: monthStart } } }),
    db.user.findMany({
      where: { role: "CLIENT", status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true, phone: true },
      orderBy: { firstName: "asc" },
    }),
    db.gymSettings.findUnique({ where: { id: "main" } }),
  ]);

  // peak hours (last 30 days)
  const monthRecords = await db.attendance.findMany({
    where: { checkInAt: { gte: new Date(todayStart.getTime() - 29 * 86400000) } },
    select: { checkInAt: true },
  });
  const hourBuckets = new Array(15).fill(0); // 08:00-22:00
  for (const r of monthRecords) {
    const h = new Date(r.checkInAt).getHours();
    if (h >= 8 && h <= 22) hourBuckets[h - 8]++;
  }

  // most active clients (this month)
  const activeCounts = await db.attendance.groupBy({
    by: ["userId"],
    where: { checkInAt: { gte: monthStart } },
    _count: { userId: true },
    orderBy: { _count: { userId: "desc" } },
    take: 5,
  });
  const topUsers = await db.user.findMany({
    where: { id: { in: activeCounts.map((a) => a.userId) } },
    select: { id: true, firstName: true, lastName: true },
  });
  const mostActive = activeCounts.map((a) => {
    const u = topUsers.find((tu) => tu.id === a.userId);
    return {
      id: a.userId,
      name: `${u?.firstName ?? ""} ${u?.lastName ?? ""}`.trim(),
      visits: a._count.userId,
    };
  });

  return (
    <AttendanceClient
      todayRecords={todayRecords.map((r) => ({
        id: r.id,
        userId: r.user.id,
        name: `${r.user.firstName ?? ""} ${r.user.lastName ?? ""}`.trim(),
        avatar: r.user.avatar,
        checkInAt: r.checkInAt.toISOString(),
        checkOutAt: r.checkOutAt?.toISOString() ?? null,
        method: r.method,
      }))}
      stats={{
        today: todayRecords.length,
        week: weekCount,
        month: monthCount,
        inGym: todayRecords.filter((r) => !r.checkOutAt).length,
      }}
      peakHours={hourBuckets}
      mostActive={mostActive}
      clients={clients.map((c) => ({
        id: c.id,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      }))}
      doubleCheckinMins={settings?.doubleCheckinMins ?? 120}
      nfcGateUrl={nfcGateUrl}
    />
  );
}
