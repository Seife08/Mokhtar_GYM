import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ReportsClient } from "@/components/admin/reports-client";

export const dynamic = "force-dynamic";

const REPORTS = ["members", "memberships", "revenue", "attendance", "workouts", "bookings"] as const;
type ReportKey = (typeof REPORTS)[number];

function toCsv(rows: Record<string, string | number | null>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number | null) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { type = "members", from, to } = await searchParams;

  const now = new Date();
  const fromDate = from ? new Date(from) : new Date(now.getFullYear(), now.getMonth(), 1);
  const toDate = to ? new Date(`${to}T23:59:59`) : now;

  let rows: Record<string, string | number | null>[] = [];
  let title = "";

  if (type === "members") {
    title = "admin.memberReport";
    const clients = await db.user.findMany({
      where: { role: "CLIENT", status: { not: "DELETED" }, createdAt: { lte: toDate } },
      include: { memberships: { where: { status: { in: ["ACTIVE", "PAUSED"] } }, orderBy: { startDate: "desc" }, take: 1, include: { plan: true } } },
      orderBy: { createdAt: "desc" },
    });
    rows = clients.map((c) => ({
      ID: c.id.slice(-8),
      FirstName: c.firstName ?? "",
      LastName: c.lastName ?? "",
      Email: c.email,
      Phone: c.phone ?? "",
      Plan: c.memberships[0]?.plan.nameEn ?? "—",
      Status: c.status,
      Joined: c.createdAt.toISOString().slice(0, 10),
    }));
  } else if (type === "memberships") {
    title = "admin.membershipReport";
    const memberships = await db.membership.findMany({
      where: { startDate: { gte: fromDate, lte: toDate } },
      include: { user: true, plan: true },
      orderBy: { startDate: "desc" },
    });
    rows = memberships.map((m) => ({
      ID: m.id.slice(-8),
      Member: `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim(),
      Plan: m.plan.nameEn,
      Start: m.startDate.toISOString().slice(0, 10),
      End: m.endDate.toISOString().slice(0, 10),
      Price: m.pricePaid,
      Status: m.status,
    }));
  } else if (type === "revenue") {
    title = "admin.revenueReport";
    const payments = await db.payment.findMany({
      where: { paidAt: { gte: fromDate, lte: toDate }, status: "PAID" },
      include: { user: true },
      orderBy: { paidAt: "desc" },
    });
    rows = payments.map((p) => ({
      ID: p.id.slice(-8),
      Member: `${p.user.firstName ?? ""} ${p.user.lastName ?? ""}`.trim(),
      Amount: p.amount,
      Method: p.method,
      Reference: p.reference ?? "",
      Date: p.paidAt.toISOString().slice(0, 10),
    }));
  } else if (type === "attendance") {
    title = "admin.attendanceReport";
    const records = await db.attendance.findMany({
      where: { checkInAt: { gte: fromDate, lte: toDate } },
      include: { user: true },
      orderBy: { checkInAt: "desc" },
    });
    rows = records.map((a) => ({
      ID: a.id.slice(-8),
      Member: `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim(),
      CheckIn: a.checkInAt.toISOString().slice(0, 16).replace("T", " "),
      CheckOut: a.checkOutAt?.toISOString().slice(11, 16) ?? "",
      Method: a.method,
    }));
  } else if (type === "workouts") {
    title = "admin.workoutReport";
    const logs = await db.workoutLog.findMany({
      where: { date: { gte: fromDate, lte: toDate }, completedAt: { not: null } },
      include: {
        clientWorkout: { include: { user: true, program: true } },
        workoutDay: true,
      },
      orderBy: { date: "desc" },
    });
    rows = logs.map((l) => ({
      ID: l.id.slice(-8),
      Member: `${l.clientWorkout.user.firstName ?? ""} ${l.clientWorkout.user.lastName ?? ""}`.trim(),
      Program: l.clientWorkout.program.nameEn,
      Day: l.workoutDay.nameEn,
      Date: l.date.toISOString().slice(0, 10),
      DurationMin: l.durationMin ?? 0,
    }));
  } else if (type === "bookings") {
    title = "admin.bookingReport";
    const bookings = await db.booking.findMany({
      where: { bookedAt: { gte: fromDate, lte: toDate } },
      include: { user: true, fitnessClass: true },
      orderBy: { bookedAt: "desc" },
    });
    rows = bookings.map((b) => ({
      ID: b.id.slice(-8),
      Member: `${b.user.firstName ?? ""} ${b.user.lastName ?? ""}`.trim(),
      Class: b.fitnessClass.nameEn,
      Date: b.fitnessClass.date.toISOString().slice(0, 10),
      Status: b.status,
    }));
  }

  const totalAmount =
    type === "revenue"
      ? rows.reduce((s, r) => s + Number(r.Amount ?? 0), 0)
      : null;

  return (
    <ReportsClient
      reportType={type}
      titleKey={title}
      rows={rows}
      from={fromDate.toISOString().slice(0, 10)}
      to={toDate.toISOString().slice(0, 10)}
      totalAmount={totalAmount}
      csv={toCsv(rows)}
    />
  );
}
