"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dumbbell,
  History,
  ChevronRight,
  CheckCircle2,
  Flame,
  BarChart3,
  Pencil,
  Play,
  Zap,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { PageHeader, EmptyState, SectionTitle } from "./ui";
import { cn } from "@/lib/utils";
import { PlanBuilder, type InitialDay, type LibraryExercise } from "./plan-builder";

interface ProgramCard {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  difficulty: string;
  goal: string | null;
  daysCount: number;
  totalExercises: number;
  startDate: string;
  todayDayId: string | null;
  todayDayNameEn: string;
  todayDayNameAr: string;
  todayDayNameFr: string;
  todayDayIndex: number;
  workedOutToday: boolean;
}

interface HistoryEntry {
  id: string;
  date: string;
  durationMin: number | null;
  dayNameEn: string;
  dayNameAr: string;
  dayNameFr: string;
  programNameEn: string;
  programNameAr: string;
  programNameFr: string;
}

export interface CustomPlanView {
  programId: string;
  clientWorkoutId: string | null;
  days: {
    id: string;
    dayOfWeek: number;
    nameEn: string;
    nameAr: string;
    nameFr: string;
    exercises: {
      weId: string;
      exerciseId: string;
      nameEn: string;
      nameAr: string;
      nameFr: string;
      muscleGroup: string;
      equipment: string | null;
      emoji: string | null;
      sets: number;
      reps: number;
      weight: number | null;
    }[];
  }[];
  workedOutToday: boolean;
  todayDayId: string | null;
}

const DIFF_KEY: Record<string, DictKey> = {
  BEGINNER: "enum.beginner",
  INTERMEDIATE: "enum.intermediate",
  ADVANCED: "enum.advanced",
};

const GOAL_KEY: Record<string, DictKey> = {
  muscle: "enum.muscle",
  strength: "enum.strength",
  fatloss: "enum.fatloss",
  fitness: "enum.fitness",
};

const MUSCLE_EMOJI: Record<string, string> = {
  chest: "🏋️",
  back: "🚣",
  shoulders: "🛡️",
  biceps: "💪",
  triceps: "🦾",
  legs: "🦵",
  glutes: "🍑",
  abs: "🎯",
  calves: "🦶",
  cardio: "🏃",
  fullbody: "🔥",
};

const DAY_KEYS: DictKey[] = [
  "hours.dayShort1",
  "hours.dayShort2",
  "hours.dayShort3",
  "hours.dayShort4",
  "hours.dayShort5",
  "hours.dayShort6",
  "hours.dayShort7",
];

export function WorkoutsClient({
  programs,
  history,
  customPlan,
  library,
  favorites,
  isoToday,
}: {
  programs: ProgramCard[];
  history: HistoryEntry[];
  customPlan: CustomPlanView | null;
  library: LibraryExercise[];
  favorites: string[];
  isoToday: number;
}) {
  const { t, pick, fmtDate } = useI18n();
  const [tab, setTab] = useState<"myplan" | "coach">("myplan");
  const [building, setBuilding] = useState(false);

  const startBuild = () => setBuilding(true);

  const initialDays: InitialDay[] | null = customPlan
    ? customPlan.days.map((d) => ({
        dayOfWeek: d.dayOfWeek,
        exercises: d.exercises.map((e) => ({
          exerciseId: e.exerciseId,
          nameEn: e.nameEn,
          nameAr: e.nameAr,
          nameFr: e.nameFr,
          muscleGroup: e.muscleGroup,
          equipment: e.equipment,
          emoji: e.emoji,
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
        })),
      }))
    : null;

  return (
    <div>
      <PageHeader title={t("workout.myWorkouts")} />

      {/* ===== mode switch ===== */}
      {building ? (
        <PlanBuilder
          initialDays={initialDays ?? []}
          library={library}
          favorites={favorites}
          onCancel={() => setBuilding(false)}
          onSaved={() => setBuilding(false)}
        />
      ) : (
        <>
          {/* tabs */}
          <div className="mb-4 flex rounded-xl border border-neutral-800 bg-[#0e0e0e] p-1">
            {(
              [
                { v: "myplan", label: t("myplan.title"), icon: Sparkles },
                { v: "coach", label: t("myplan.assigned"), icon: Dumbbell, badge: programs.length },
              ] as { v: "myplan" | "coach"; label: string; icon: React.ElementType; badge?: number }[]
            ).map((seg) => (
              <button
                key={seg.v}
                type="button"
                onClick={() => setTab(seg.v)}
                className={cn(
                  "relative flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-bold transition-colors",
                  tab === seg.v ? "bg-primary text-black" : "text-neutral-500"
                )}
              >
                <seg.icon className="h-4 w-4" />
                {seg.label}
                {seg.badge !== undefined && seg.badge > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[9px] font-black tabular-nums",
                      tab === seg.v ? "bg-black/20 text-black" : "bg-[#1e1e1e] text-primary"
                    )}
                  >
                    {seg.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: "easeOut" }}
            >
              {tab === "myplan" ? (
                <MyPlanView
                  customPlan={customPlan}
                  isoToday={isoToday}
                  onBuild={startBuild}
                />
              ) : (
                <CoachPlansView programs={programs} history={history} />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

/* ================= MY PLAN (view mode) ================= */

function MyPlanView({
  customPlan,
  isoToday,
  onBuild,
}: {
  customPlan: CustomPlanView | null;
  isoToday: number;
  onBuild: () => void;
}) {
  const { t, pick } = useI18n();
  const [openDay, setOpenDay] = useState<number | null>(null);
  /* no plan yet → invitation card */
  if (!customPlan) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="surface-card card-sheen relative overflow-hidden rounded-2xl p-6"
      >
        <div className="pointer-events-none absolute -end-10 -top-10 text-[120px] leading-none opacity-[0.06]">
          🏋️
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 text-[22px]">
            💪
          </span>
          <h2 className="font-display text-[18px] font-black text-neutral-50">
            {t("myplan.build")}
          </h2>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">
          {t("myplan.buildDesc")}
        </p>
        <button
          onClick={onBuild}
          className="animate-pulse-gold mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-extrabold tracking-wider text-black transition-all hover:bg-[#ffd700] active:scale-[0.98]"
        >
          <Zap className="h-5 w-5" />
          {t("myplan.build")}
        </button>
      </motion.div>
    );
  }

  const totalEx = customPlan.days.reduce((s, d) => s + d.exercises.length, 0);
  const todayIsTraining = customPlan.days.some((d) => d.dayOfWeek === isoToday);
  const todayDay =
    customPlan.days.find((d) => d.dayOfWeek === isoToday) ?? null;
  const trainingDays = new Set(customPlan.days.map((d) => d.dayOfWeek));

  return (
    <div>
      {/* ===== week strip ===== */}
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_KEYS.map((key, i) => {
          const dow = i + 1;
          const isTraining = trainingDays.has(dow);
          const isToday = dow === isoToday;
          return (
            <div
              key={dow}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-xl border text-[11.5px] font-black transition-colors",
                isTraining
                  ? "border-primary/40 bg-primary/[0.08] text-primary"
                  : "border-neutral-800/60 bg-[#0d0d0d] text-neutral-700"
              )}
            >
              {t(key)}
              {isToday && (
                <span className="mt-1 h-1 w-4 rounded-full bg-primary" />
              )}
            </div>
          );
        })}
      </div>

      {/* ===== today CTA ===== */}
      <div className="mt-4">
        {todayIsTraining && todayDay && customPlan.clientWorkoutId ? (
          <Link
            href={`/client/workouts/${customPlan.clientWorkoutId}?day=${todayDay.id}`}
            className={cn(
              "flex items-center justify-between rounded-2xl border px-4 py-4 transition-colors",
              customPlan.workedOutToday
                ? "border-success/30 bg-success/[0.06]"
                : "border-primary/30 bg-primary/[0.07] hover:bg-primary/[0.12]"
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              {customPlan.workedOutToday ? (
                <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
              ) : (
                <Flame className="h-6 w-6 shrink-0 text-primary" />
              )}
              <div className="min-w-0">
                <p className="truncate text-[14px] font-black text-neutral-100">
                  {customPlan.workedOutToday
                    ? t("workout.completeTitle")
                    : t("myplan.startSession")}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-neutral-500 tabular-nums">
                  {t("myplan.exCount", { n: todayDay.exercises.length })}
                </p>
              </div>
            </div>
            {!customPlan.workedOutToday && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-black">
                <Play className="h-5 w-5 rtl-flip" />
              </span>
            )}
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-neutral-800/70 bg-[#0d0d0d] px-4 py-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#141414] text-[17px]">
              😴
            </span>
            <div>
              <p className="text-[14px] font-black text-neutral-200">{t("myplan.restDay")}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">{t("myplan.restDayDesc")}</p>
            </div>
          </div>
        )}
      </div>

      {/* ===== day cards ===== */}
      <div className="mt-5 space-y-2.5">
        {customPlan.days.map((d) => {
          const open = openDay === d.dayOfWeek;
          return (
            <div key={d.id} className="surface-card overflow-hidden rounded-2xl">
              <button
                type="button"
                onClick={() => setOpenDay(open ? null : d.dayOfWeek)}
                className="flex w-full items-center justify-between px-4 py-3.5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-black",
                      d.dayOfWeek === isoToday
                        ? "bg-primary text-black"
                        : "bg-[#1a1a1a] text-primary"
                    )}
                  >
                    {t(DAY_KEYS[d.dayOfWeek - 1])}
                  </span>
                  <div className="min-w-0 text-start">
                    <p className="truncate text-[13.5px] font-bold text-neutral-100">
                      {pick({ nameAr: d.nameAr, nameFr: d.nameFr, nameEn: d.nameEn })}
                    </p>
                    <p className="mt-0.5 text-[10.5px] font-semibold text-neutral-600 tabular-nums">
                      {t("myplan.exCount", { n: d.exercises.length })}
                    </p>
                  </div>
                </div>
                <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="h-5 w-5 text-neutral-600" />
                </motion.span>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden border-t border-neutral-800/60"
                  >
                    <div className="divide-y divide-neutral-800/50">
                      {d.exercises.map((ex) => (
                        <div key={ex.weId} className="flex items-center gap-3 px-4 py-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#141414] text-[15px]">
                            {ex.emoji ?? MUSCLE_EMOJI[ex.muscleGroup] ?? "⚡"}
                          </span>
                          <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-neutral-200">
                            {pick({ nameAr: ex.nameAr, nameFr: ex.nameFr, nameEn: ex.nameEn })}
                          </p>
                          <span className="shrink-0 text-[11px] font-black text-primary tabular-nums">
                            {ex.sets}×{ex.reps}
                            {ex.weight != null && (
                              <span className="ms-1 font-bold text-neutral-500">
                                {ex.weight}kg
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                      {d.exercises.length === 0 && (
                        <p className="py-4 text-center text-[12px] text-neutral-600">
                          {t("myplan.emptyDay")}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ===== edit CTA ===== */}
      <div className="mt-5 flex gap-2.5">
        <button
          onClick={onBuild}
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.06] text-[13px] font-bold text-primary transition-all hover:bg-primary/[0.12] active:scale-[0.98]"
        >
          <Pencil className="h-4.5 w-4.5" />
          {t("common.edit")}
        </button>
      </div>

      {/* summary line */}
      <p className="mt-4 text-center text-[11px] font-semibold text-neutral-600">
        {t("myplan.totalPlan", { days: customPlan.days.length, ex: totalEx })}
      </p>
    </div>
  );
}

/* ================= COACH PLANS (existing) ================= */

function CoachPlansView({
  programs,
  history,
}: {
  programs: ProgramCard[];
  history: HistoryEntry[];
}) {
  const { t, pick, fmtDate } = useI18n();

  return (
    <div>
      {programs.length === 0 ? (
        <EmptyState
          icon={Dumbbell}
          title={t("workout.noWorkout")}
          desc={t("workout.noWorkoutDesc")}
        />
      ) : (
        <div className="space-y-4">
          {programs.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.28 }}
              className="surface-card card-sheen overflow-hidden rounded-2xl"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display truncate text-[17px] font-black text-neutral-50">
                      {pick({ nameAr: p.nameAr, nameFr: p.nameFr, nameEn: p.nameEn })}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-[#151515] px-2 py-0.5 text-[10px] font-bold text-neutral-400">
                        {t(DIFF_KEY[p.difficulty] ?? "enum.intermediate")}
                      </span>
                      {p.goal && (
                        <span className="rounded-md border border-primary/15 bg-primary/[0.06] px-2 py-0.5 text-[10px] font-bold text-primary/90">
                          {t(GOAL_KEY[p.goal] ?? "enum.fitness")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="font-display text-xl font-black text-primary tabular-nums">
                      {p.daysCount}
                    </span>
                    <span className="text-[9px] font-bold text-neutral-600 uppercase">
                      {t("workout.days")}
                    </span>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center gap-4 text-[11px] text-neutral-500">
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    {t("admin.exercisesCount", { n: p.totalExercises })}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <History className="h-3.5 w-3.5" />
                    {t("profile.memberSince")} {fmtDate(p.startDate)}
                  </span>
                </div>
              </div>

              {/* today's day strip */}
              {p.todayDayId && (
                <Link
                  href={`/client/workouts/${p.id}?day=${p.todayDayId}`}
                  className={cn(
                    "flex items-center justify-between border-t border-neutral-800/70 px-4 py-3.5 transition-colors",
                    p.workedOutToday
                      ? "bg-success/[0.06] hover:bg-success/[0.1]"
                      : "bg-primary/[0.05] hover:bg-primary/[0.1]"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {p.workedOutToday ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <Flame className="h-5 w-5 shrink-0 text-primary" />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-neutral-200">
                        {t("home.todaysWorkout")}:{" "}
                        {pick({
                          nameAr: p.todayDayNameAr,
                          nameFr: p.todayDayNameFr,
                          nameEn: p.todayDayNameEn,
                        })}
                      </p>
                      <p className="text-[10px] text-neutral-600">
                        {p.todayDayIndex + 1} / {p.daysCount}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-neutral-600 rtl-flip" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* history */}
      {history.length > 0 && (
        <section className="mt-8">
          <SectionTitle>{t("workout.history")}</SectionTitle>
          <div className="space-y-2">
            {history.map((h) => (
              <div
                key={h.id}
                className="surface-card flex items-center justify-between rounded-xl p-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-neutral-200">
                    {pick({ nameAr: h.dayNameAr, nameFr: h.dayNameFr, nameEn: h.dayNameEn })}
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-neutral-600">
                    {fmtDate(h.date, { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2.5">
                  {h.durationMin && (
                    <span className="rounded-md bg-[#151515] px-2 py-1 text-[10px] font-bold text-neutral-400 tabular-nums">
                      {h.durationMin} {t("common.minutes")}
                    </span>
                  )}
                  <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
