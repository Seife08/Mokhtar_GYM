import Link from "next/link";
import {
  Dumbbell,
  CalendarCheck,
  TrendingUp,
  Salad,
  Users2,
  QrCode,
  Flame,
  ChevronRight,
  Megaphone,
  Clock,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import {
  membershipStatus,
  daysRemaining,
  membershipProgress,
  latestMembership,
  attendanceStreak,
} from "@/lib/membership";
import { ClientHome } from "@/components/client/home-client";

export const dynamic = "force-dynamic";

export default async function ClientHomePage() {
  const me = await requireClient();
  if (!me) return null;

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const expiringDays = settings?.expiringSoonDays ?? 7;

  const [memberships, attendance, progress, booking, announcements, todayLogs] =
    await Promise.all([
      db.membership.findMany({
        where: { userId: me.id },
        include: { plan: true },
        orderBy: { startDate: "desc" },
      }),
      db.attendance.findMany({
        where: { userId: me.id },
        orderBy: { checkInAt: "desc" },
        take: 120,
      }),
      db.progressEntry.findMany({
        where: { userId: me.id },
        orderBy: { date: "desc" },
        take: 5,
      }),
      db.booking.findFirst({
        where: { userId: me.id, status: "BOOKED" },
        include: { fitnessClass: true },
        orderBy: { fitnessClass: { date: "asc" } },
      }),
      db.announcement.findMany({
        where: { status: "PUBLISHED", startDate: { lte: new Date() } },
        orderBy: [{ priority: "desc" }, { startDate: "desc" }],
        take: 3,
      }),
      db.workoutLog.findMany({
        where: {
          clientWorkout: { userId: me.id },
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

  // membership
  const current = latestMembership(memberships, expiringDays, settings?.gracePeriodDays ?? 0);
  const membershipData = current
    ? {
        status: current.status,
        planName: current.m.plan.nameEn, // localized client-side via pick
        planNameAr: current.m.plan.nameAr,
        planNameFr: current.m.plan.nameFr,
        remainingDays: daysRemaining(current.m),
        endDate: current.m.endDate.toISOString(),
        progress: membershipProgress(current.m),
      }
    : null;

  // attendance summary
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const visitsThisMonth = attendance.filter(
    (a) => a.checkInAt >= monthStart
  ).length;
  const streak = attendanceStreak(attendance.map((a) => a.checkInAt));
  const lastVisit = attendance[0]?.checkInAt?.toISOString() ?? null;

  // progress summary
  const latestWeight = progress[0]?.weight ?? null;
  const prevWeight = progress[1]?.weight ?? null;
  const weightChange =
    latestWeight !== null && prevWeight !== null
      ? Math.round((latestWeight - prevWeight) * 10) / 10
      : null;

  // today's workout — assigned program
  const cw = await db.clientWorkout.findFirst({
    where: { userId: me.id, status: "ACTIVE" },
    include: { program: { include: { days: { orderBy: { dayIndex: "asc" } } } } },
    orderBy: { createdAt: "desc" },
  });

  let todayWorkout = null as null | {
    clientWorkoutId: string;
    workoutDayId: string;
    nameAr: string;
    nameFr: string;
    nameEn: string;
    focus: string;
    estMinutes: number;
    exerciseCount: number;
    dayIndex: number;
    daysCount: number;
  };
  if (cw && cw.program.days.length > 0) {
    // rotate day by attendance-day count since start
    const daysSince = Math.max(0, Math.floor((Date.now() - new Date(cw.startDate).getTime()) / 86400000));
    const day = cw.program.days[daysSince % cw.program.days.length];
    const count = await db.workoutExercise.count({ where: { workoutDayId: day.id } });
    todayWorkout = {
      clientWorkoutId: cw.id,
      workoutDayId: day.id,
      nameAr: day.nameAr,
      nameFr: day.nameFr,
      nameEn: day.nameEn,
      focus: day.focus ?? "",
      estMinutes: day.estMinutes,
      exerciseCount: count,
      dayIndex: day.dayIndex,
      daysCount: cw.program.days.length,
    };
  }

  const upcomingClass = booking
    ? {
        id: booking.fitnessClass.id,
        nameAr: booking.fitnessClass.nameAr,
        nameFr: booking.fitnessClass.nameFr,
        nameEn: booking.fitnessClass.nameEn,
        date: booking.fitnessClass.date.toISOString(),
        instructor: booking.fitnessClass.instructor,
      }
    : null;

  return (
    <ClientHome
      user={{
        firstName: me.firstName,
        dob: me.dob?.toISOString() ?? null,
      }}
      membership={membershipData}
      stats={{
        visitsThisMonth,
        streak,
        lastVisit,
        latestWeight,
        weightChange,
      }}
      todayWorkout={todayWorkout}
      upcomingClass={upcomingClass}
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        priority: a.priority,
      }))}
      workedOutToday={todayLogs.length > 0}
    />
  );
}
