import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { membershipStatus } from "@/lib/membership";
import { DashboardClient } from "@/components/admin/dashboard-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysAgo30 = new Date(todayStart.getTime() - 29 * 86400000);

  const [allClients, payments, todayAttendance, paymentsToday, bookings, activePrograms] =
    await Promise.all([
      db.user.findMany({
        where: { role: "CLIENT", status: { not: "DELETED" } },
        include: {
          memberships: { where: { status: { in: ["ACTIVE", "PAUSED"] } }, include: { plan: true } },
        },
      }),
      db.payment.findMany({
        where: { status: "PAID", paidAt: { gte: daysAgo30 } },
        orderBy: { paidAt: "asc" },
      }),
      db.attendance.findMany({
        where: { checkInAt: { gte: todayStart } },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      db.payment.findMany({
        where: { status: "PAID", paidAt: { gte: todayStart } },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      db.booking.count({
        where: { status: "BOOKED", bookedAt: { gte: todayStart } },
      }),
      db.clientWorkout.count({ where: { status: "ACTIVE" } }),
    ]);

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const expDays = settings?.expiringSoonDays ?? 7;

  // stats
  const totalMembers = allClients.length;
  let activeMembers = 0;
  let expiredCount = 0;
  let expiringSoon = 0;
  const planCount: Record<string, number> = {};

  for (const c of allClients) {
    const m = c.memberships[0];
    if (!m) {
      continue;
    }
    const status = membershipStatus(m, expDays, 0);
    if (status === "ACTIVE" || status === "EXPIRING_SOON") {
      activeMembers++;
      planCount[m.plan.nameEn] = (planCount[m.plan.nameEn] ?? 0) + 1;
    }
    if (status === "EXPIRING_SOON") expiringSoon++;
    if (status === "EXPIRED") expiredCount++;
  }
  const noMembership = totalMembers - activeMembers - expiredCount;

  const todayRevenue = paymentsToday.reduce((s, p) => s + p.amount, 0);
  const monthPayments = await db.payment.findMany({
    where: { status: "PAID", paidAt: { gte: monthStart } },
  });
  const monthlyRevenue = monthPayments.reduce((s, p) => s + p.amount, 0);

  // revenue series (daily, last 30 days)
  const revenueSeries: { date: string; value: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const day = new Date(todayStart.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    const sum = payments
      .filter((p) => p.paidAt >= day && p.paidAt < next)
      .reduce((s, p) => s + p.amount, 0);
    revenueSeries.push({
      date: day.toISOString().slice(5, 10),
      value: sum,
    });
  }

  // attendance series (last 14 days)
  const attendanceAll = await db.attendance.findMany({
    where: { checkInAt: { gte: new Date(todayStart.getTime() - 13 * 86400000) } },
    select: { checkInAt: true },
  });
  const attendanceSeries: { date: string; value: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const day = new Date(todayStart.getTime() - i * 86400000);
    const next = new Date(day.getTime() + 86400000);
    const count = attendanceAll.filter((a) => a.checkInAt >= day && a.checkInAt < next).length;
    attendanceSeries.push({ date: day.toISOString().slice(5, 10), value: count });
  }

  // member growth (cumulative, last 6 months)
  const growthSeries: { date: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59);
    const count = allClients.filter((c) => c.createdAt <= monthEnd).length;
    growthSeries.push({
      date: new Intl.DateTimeFormat("en", { month: "short" }).format(
        new Date(now.getFullYear(), now.getMonth() - i, 1)
      ),
      value: count,
    });
  }

  // recent payments & members
  const recentPayments = paymentsToday
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      name: `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim(),
      amount: p.amount,
      method: p.method,
      time: p.paidAt.toISOString(),
    }));

  const recentMembers = allClients
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((c) => ({
      id: c.id,
      name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      createdAt: c.createdAt.toISOString(),
    }));

  // expiring list count for alerts
  const expiringSoonList = allClients.filter((c) => {
    const m = c.memberships[0];
    if (!m) return false;
    const status = membershipStatus(m, expDays, 0);
    const remaining = Math.ceil((new Date(m.endDate).getTime() - now.getTime()) / 86400000);
    return status === "EXPIRING_SOON" && remaining >= 0;
  }).length;

  const expiredTodayCount = allClients.filter((c) => {
    const m = c.memberships[0];
    if (!m) return false;
    const end = new Date(m.endDate);
    return end <= now && end >= new Date(todayStart.getTime() - 86400000);
  }).length;

  return (
    <DashboardClient
      stats={{
        totalMembers,
        activeMembers,
        expiredCount,
        expiringSoon: expiringSoonList,
        noMembership,
        todayAttendance: todayAttendance.length,
        inGymNow: todayAttendance.filter((a) => !a.checkOutAt).length,
        todayRevenue,
        monthlyRevenue,
        activePrograms,
        newBookings: bookings,
        paymentsToday: paymentsToday.length,
        expiredToday: expiredTodayCount,
      }}
      revenueSeries={revenueSeries}
      attendanceSeries={attendanceSeries}
      growthSeries={growthSeries}
      planDistribution={Object.entries(planCount).map(([name, value]) => ({ name, value }))}
      recentPayments={recentPayments}
      recentMembers={recentMembers}
    />
  );
}
