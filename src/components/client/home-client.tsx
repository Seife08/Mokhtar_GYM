"use client";

import Link from "next/link";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { MembershipCard } from "./membership-card";
import { SectionTitle, StatTile, EmptyState } from "./ui";
import { cn } from "@/lib/utils";
import type { MembershipStatus } from "@/lib/membership";

interface TodayWorkout {
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
}

const QUICK_ACTIONS: {
  href: string;
  icon: React.ElementType;
  key: DictKey;
}[] = [
  { href: "/client/workouts", icon: Dumbbell, key: "home.myWorkout" },
  { href: "/client/attendance", icon: CalendarCheck, key: "nav.attendance" },
  { href: "/client/progress", icon: TrendingUp, key: "home.myProgress" },
  { href: "/client/diet", icon: Salad, key: "home.dietPlan" },
  { href: "/client/classes", icon: Users2, key: "nav.classes" },
  { href: "/client/qr", icon: QrCode, key: "home.qrCode" },
];

export function ClientHome({
  user,
  membership,
  stats,
  todayWorkout,
  upcomingClass,
  announcements,
  workedOutToday,
}: {
  user: { firstName: string | null; dob: string | null };
  membership: null | {
    status: MembershipStatus;
    planName: string;
    planNameAr: string;
    planNameFr: string;
    remainingDays: number;
    endDate: string;
    progress: number;
  };
  stats: {
    visitsThisMonth: number;
    streak: number;
    lastVisit: string | null;
    latestWeight: number | null;
    weightChange: number | null;
  };
  todayWorkout: TodayWorkout | null;
  upcomingClass: null | {
    id: string;
    nameAr: string;
    nameFr: string;
    nameEn: string;
    date: string;
    instructor: string | null;
  };
  announcements: { id: string; title: string; priority: string }[];
  workedOutToday: boolean;
}) {
  const { t, pick, fmtDate } = useI18n();

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "home.goodMorning" : hour < 18 ? "home.goodAfternoon" : "home.goodEvening";

  // birthday check
  const isBirthday = (() => {
    if (!user.dob) return false;
    const d = new Date(user.dob);
    const now = new Date();
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  })();

  const planName = membership
    ? pick({ nameAr: membership.planNameAr, nameFr: membership.planNameFr, nameEn: membership.planName })
    : "";

  const weightDir =
    stats.weightChange !== null
      ? stats.weightChange < 0
        ? t("home.lost")
        : t("home.gained")
      : null;

  return (
    <div className="space-y-6">
      {/* ===== greeting ===== */}
      <div className="animate-fade-up">
        <h1 className="font-display text-[22px] font-black tracking-tight text-neutral-50">
          {t(greeting as DictKey, { name: user.firstName ?? "" })}
        </h1>
        {isBirthday && (
          <p className="mt-1 text-[13px] font-semibold text-primary">
            {t("home.happyBirthday", { name: user.firstName ?? "" })}
          </p>
        )}
      </div>

      {/* ===== membership card ===== */}
      {membership ? (
        <MembershipCard
          data={{ ...membership, planName }}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="surface-card rounded-2xl p-5 text-center"
        >
          <p className="text-[14px] font-bold text-neutral-200">
            {t("membership.noMembership")}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-600">
            {t("membership.noMembershipDesc")}
          </p>
          <Link
            href="/client/gym-info"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-primary/10 px-6 text-[12px] font-extrabold tracking-wide text-primary transition-colors hover:bg-primary/20"
          >
            {t("membership.joinNow")}
          </Link>
        </motion.div>
      )}

      {/* ===== quick actions ===== */}
      <section>
        <SectionTitle>{t("home.quickActions")}</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((qa, i) => {
            const Icon = qa.icon;
            return (
              <motion.div
                key={qa.href}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.3 }}
              >
                <Link
                  href={qa.href}
                  className="surface-card group flex h-[86px] flex-col items-center justify-center gap-2 rounded-xl transition-all hover:border-primary/30 hover:bg-[#181818] active:scale-95"
                >
                  <Icon
                    className="h-6 w-6 text-neutral-500 transition-colors group-hover:text-primary"
                    strokeWidth={1.8}
                  />
                  <span className="px-1 text-center text-[10.5px] font-bold text-neutral-400 group-hover:text-neutral-200">
                    {t(qa.key)}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ===== today's workout ===== */}
      <section>
        <SectionTitle>{t("home.todaysWorkout")}</SectionTitle>
        {todayWorkout ? (
          <div className="surface-card card-sheen animate-fade-up rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display truncate text-[16px] font-black text-neutral-50">
                  {pick({ nameAr: todayWorkout.nameAr, nameFr: todayWorkout.nameFr, nameEn: todayWorkout.nameEn })}
                </p>
                <p className="mt-1 text-[11px] text-neutral-500">
                  {t("home.exercisesCount", { n: todayWorkout.exerciseCount })}
                  {todayWorkout.estMinutes ? ` · ${todayWorkout.estMinutes} ${t("common.minutes")}` : ""}
                </p>
              </div>
              <span className="shrink-0 rounded-md bg-[#151515] px-2 py-1 text-[10px] font-bold text-neutral-500">
                {todayWorkout.dayIndex + 1}/{todayWorkout.daysCount}
              </span>
            </div>
            {todayWorkout.focus && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {todayWorkout.focus.split(",").map((f) => (
                  <span
                    key={f}
                    className="rounded-md border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-bold text-primary/90"
                  >
                    {t(`enum.${f}` as DictKey)}
                  </span>
                ))}
              </div>
            )}
            <Link
              href={`/client/workouts/${todayWorkout.clientWorkoutId}?day=${todayWorkout.workoutDayId}`}
              className={cn(
                "mt-4 flex h-11 items-center justify-center gap-2 rounded-lg text-[12px] font-extrabold tracking-wide transition-colors",
                workedOutToday
                  ? "border border-success/30 bg-success/10 text-success"
                  : "bg-primary text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] hover:bg-[#ffd700]"
              )}
            >
              <Dumbbell className="h-4 w-4" />
              {workedOutToday ? t("workout.completedMark") : t("home.startWorkout")}
            </Link>
          </div>
        ) : (
          <EmptyState icon={Dumbbell} title={t("home.noWorkoutYet")} desc={t("home.noWorkoutDesc")} />
        )}
      </section>

      {/* ===== attendance + weight stats ===== */}
      <section>
        <SectionTitle>{t("nav.attendance")}</SectionTitle>
        <div className="grid grid-cols-3 gap-3">
          <StatTile
            label={t("home.visitsThisMonth")}
            value={stats.visitsThisMonth}
            icon={CalendarCheck}
            accent="gold"
          />
          <StatTile
            label={t("home.currentStreak")}
            value={stats.streak}
            sub={t("common.days")}
            icon={Flame}
            accent="warning"
          />
          <StatTile
            label={t("home.lastVisit")}
            value={
              stats.lastVisit
                ? fmtDate(stats.lastVisit, { day: "numeric", month: "short" })
                : "—"
            }
            icon={CalendarCheck}
          />
        </div>
        <Link
          href="/client/attendance"
          className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-neutral-800 py-2.5 text-[12px] font-bold text-neutral-400 transition-colors hover:border-primary/30 hover:text-primary"
        >
          {t("home.viewAttendance")}
          <ChevronRight className="h-3.5 w-3.5 rtl-flip" />
        </Link>
      </section>

      {/* ===== progress summary ===== */}
      {stats.latestWeight !== null && (
        <section>
          <SectionTitle>{t("nav.progress")}</SectionTitle>
          <div className="surface-card animate-fade-up rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
                  {t("home.currentWeight")}
                </p>
                <p className="font-display mt-1 text-2xl font-black text-primary tabular-nums">
                  {stats.latestWeight}
                  <span className="ms-1 text-xs font-bold text-neutral-500">{t("progress.kg")}</span>
                </p>
              </div>
              {stats.weightChange !== null && (
                <div className="text-end">
                  <p
                    className={cn(
                      "font-display text-lg font-black tabular-nums",
                      stats.weightChange < 0 ? "text-success" : "text-warning"
                    )}
                  >
                    {stats.weightChange > 0 ? "+" : ""}
                    {stats.weightChange} {t("progress.kg")}
                  </p>
                  <p className="text-[10px] text-neutral-600">{t("home.sinceLastMonth")}</p>
                </div>
              )}
            </div>
            <Link
              href="/client/progress"
              className="mt-3.5 flex items-center justify-center gap-1 rounded-lg border border-neutral-800 py-2.5 text-[12px] font-bold text-neutral-400 transition-colors hover:border-primary/30 hover:text-primary"
            >
              {t("home.viewProgress")}
              <ChevronRight className="h-3.5 w-3.5 rtl-flip" />
            </Link>
          </div>
        </section>
      )}

      {/* ===== upcoming class ===== */}
      {upcomingClass && (
        <section>
          <SectionTitle>{t("home.upcomingClass")}</SectionTitle>
          <Link
            href="/client/classes"
            className="surface-card animate-fade-up flex items-center justify-between rounded-2xl p-4 transition-colors hover:border-primary/30"
          >
            <div>
              <p className="font-display text-[15px] font-bold text-neutral-100">
                {pick({ nameAr: upcomingClass.nameAr, nameFr: upcomingClass.nameFr, nameEn: upcomingClass.nameEn })}
              </p>
              <p className="mt-1 text-[11px] text-neutral-500">
                {fmtDate(upcomingClass.date, { weekday: "short", day: "numeric", month: "short" })}
                {upcomingClass.instructor ? ` · ${upcomingClass.instructor}` : ""}
              </p>
            </div>
            <Users2 className="h-6 w-6 text-primary/70" />
          </Link>
        </section>
      )}

      {/* ===== announcements ===== */}
      {announcements.length > 0 && (
        <section>
          <SectionTitle
            action={
              <Link href="/client/announcements" className="text-[11px] font-bold text-primary hover:underline">
                {t("home.viewAll")}
              </Link>
            }
          >
            {t("ann.title")}
          </SectionTitle>
          <div className="space-y-2">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href="/client/announcements"
                className="surface-card flex items-center gap-3 rounded-xl p-3.5 transition-colors hover:border-primary/25"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#151515]">
                  <Megaphone className="h-4.5 w-4.5 text-neutral-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-neutral-200">{a.title}</p>
                  {a.priority === "HIGH" && (
                    <span className="mt-0.5 inline-block text-[10px] font-bold text-warning">
                      {t("ann.priority.high")}
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-neutral-700 rtl-flip" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
