"use client";

/**
 * ExerciseProgress — smart merge of workout-session data into the Progress
 * page (قاعدة Strong/Hevy/Liftlog): weekly volume bars, per-exercise PRs and
 * trend arrows computed from the per-set JSON saved by each session.
 */

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Dumbbell, TrendingUp, TrendingDown, Minus, Layers, Activity, Trophy } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { EmptyState } from "./ui";

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

export interface WorkoutLogLite {
  id: string;
  date: string;
  durationMin: number | null;
  setsJson: string | null;
  dayNameEn: string;
  dayNameAr: string;
  dayNameFr: string;
}

export interface ExerciseLite {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  muscleGroup: string;
  emoji: string | null;
}

interface ExSession {
  date: number;
  volume: number; // Σ w×r
  topWeight: number; // max w with max reps at that weight
  topSet: { w: number; r: number };
  sets: number;
}

interface ExStats {
  sessions: ExSession[];
  totalVolume: number;
  totalSets: number;
  best: ExSession;
  last: ExSession;
  prev: ExSession;
}

export function ExerciseProgress({
  logs,
  exercises,
}: {
  logs: WorkoutLogLite[];
  exercises: ExerciseLite[];
}) {
  const { t, pick, fmtDate, locale } = useI18n();

  /* ---- aggregate per exercise ---- */
  const { perExercise, weekly, totals } = useMemo(() => {
    const exMap = new Map<string, ExSession[]>();
    let totalVolume = 0;
    let totalSets = 0;
    const weekMap = new Map<string, number>(); // "year-Wweek" → volume

    for (const log of logs) {
      if (!log.setsJson) continue;
      let parsed: Record<string, { w: number; r: number }[]>;
      try {
        parsed = JSON.parse(log.setsJson);
      } catch {
        continue;
      }
      const ts = new Date(log.date).getTime();
      // ISO-ish week key (Monday start)
      const d = new Date(log.date);
      const day = (d.getDay() + 6) % 7; // Mon=0
      d.setDate(d.getDate() - day);
      const weekKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      for (const [exId, sets] of Object.entries(parsed)) {
        if (!Array.isArray(sets) || sets.length === 0) continue;
        const volume = sets.reduce((s, st) => s + (st.w || 0) * (st.r || 0), 0);
        const topSet = sets.reduce((a, b) => (b.w > a.w ? b : a), sets[0]);
        const session: ExSession = {
          date: ts,
          volume,
          topWeight: topSet.w,
          topSet,
          sets: sets.length,
        };
        const list = exMap.get(exId) ?? [];
        list.push(session);
        exMap.set(exId, list);

        totalVolume += volume;
        totalSets += sets.length;
        weekMap.set(weekKey, (weekMap.get(weekKey) ?? 0) + volume);
      }
    }

    // last 8 weeks buckets
    const now = new Date();
    const nowDay = (now.getDay() + 6) % 7;
    const weeks: { key: string; label: string; volume: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - nowDay - i * 7);
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
      weeks.push({
        key,
        label: new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-GB", {
          day: "numeric",
          month: "short",
        }).format(start),
        volume: weekMap.get(key) ?? 0,
      });
    }

    return {
      perExercise: exMap,
      weekly: weeks,
      totals: { volume: totalVolume, sets: totalSets, sessions: logs.filter((l) => l.setsJson).length },
    };
  }, [logs, locale]);

  if (totals.sessions === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title={t("exprog.noData")}
        desc={t("exprog.noDataDesc")}
      />
    );
  }

  const maxWeek = Math.max(...weekly.map((w) => w.volume), 1);

  /* ---- per-exercise PR cards ---- */
  const cards = exercises
    .filter((e) => perExercise.has(e.id))
    .map((e) => {
      const sessions = [...(perExercise.get(e.id) ?? [])].sort((a, b) => a.date - b.date);
      const stats: ExStats = {
        sessions,
        totalVolume: sessions.reduce((s, x) => s + x.volume, 0),
        totalSets: sessions.reduce((s, x) => s + x.sets, 0),
        best: sessions.reduce((a, b) => (b.topWeight > a.topWeight ? b : a), sessions[0]),
        last: sessions[sessions.length - 1],
        prev: sessions[sessions.length - 2] ?? sessions[0],
      };
      return { ex: e, stats };
    })
    .sort((a, b) => b.stats.totalVolume - a.stats.totalVolume)
    .slice(0, 12);

  return (
    <div>
      {/* ===== stat row ===== */}
      <div className="grid grid-cols-3 gap-3">
        <div className="surface-card rounded-xl p-3.5">
          <p className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
            <Activity className="h-3 w-3" /> {t("exprog.sessions")}
          </p>
          <p className="font-display mt-1 text-lg font-black text-neutral-100 tabular-nums">
            {totals.sessions}
          </p>
        </div>
        <div className="surface-card rounded-xl p-3.5">
          <p className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
            <Layers className="h-3 w-3" /> {t("exprog.setsCompleted")}
          </p>
          <p className="font-display mt-1 text-lg font-black text-neutral-100 tabular-nums">
            {totals.sets}
          </p>
        </div>
        <div className="surface-card rounded-xl p-3.5">
          <p className="flex items-center gap-1 text-[10px] font-bold text-neutral-500 uppercase">
            <Trophy className="h-3 w-3 text-primary" /> {t("setlog.volume")}
          </p>
          <p className="font-display mt-1 text-lg font-black text-primary tabular-nums">
            {Math.round(totals.volume).toLocaleString("en-US")}
            <span className="ms-1 text-[10px] text-neutral-500">{t("setlog.volumeUnit")}</span>
          </p>
        </div>
      </div>

      {/* ===== weekly volume bars ===== */}
      <section className="mt-6">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
          {t("exprog.weeklyVolume")}
        </h2>
        <div className="surface-card mt-2.5 rounded-2xl p-4">
          <div className="flex h-[130px] items-end gap-1.5" dir="ltr">
            {weekly.map((w, i) => (
              <motion.div
                key={w.key}
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(3, (w.volume / maxWeek) * 100)}%` }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: "easeOut" }}
                className={cn(
                  "group relative flex-1 rounded-t-md",
                  w.volume === maxWeek && w.volume > 0
                    ? "bg-primary"
                    : w.volume > 0
                      ? "bg-[#6b5313] group-hover:bg-[#B8860B]"
                      : "bg-[#1c1c1c]"
                )}
              >
                {w.volume > 0 && (
                  <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-black text-neutral-400 tabular-nums opacity-0 transition-opacity group-hover:opacity-100">
                    {Math.round(w.volume).toLocaleString("en-US")}
                  </span>
                )}
                <span className="absolute -bottom-4.5 left-1/2 w-8 -translate-x-1/2 truncate text-center text-[8px] font-semibold text-neutral-600">
                  {w.label}
                </span>
              </motion.div>
            ))}
          </div>
          <p className="mt-6 text-center text-[9.5px] text-neutral-600">8 {t("workout.days").replace(/s|يام|أيام|jours/, "")}</p>
        </div>
      </section>

      {/* ===== per-exercise PRs ===== */}
      <section className="mt-6">
        <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-neutral-500">
          {t("exprog.best")}
        </h2>
        <div className="mt-2.5 space-y-2.5">
          {cards.map(({ ex, stats }, i) => {
            const trend =
              stats.last.topWeight > stats.prev.topWeight
                ? "up"
                : stats.last.topWeight < stats.prev.topWeight
                  ? "down"
                  : "flat";
            const isPR = stats.best.date === stats.last.date && stats.sessions.length > 1;
            return (
              <motion.div
                key={ex.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="surface-card flex items-center gap-3 rounded-xl p-3.5"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neutral-800 bg-[#141414] text-[19px]">
                  {ex.emoji ?? MUSCLE_EMOJI[ex.muscleGroup] ?? "⚡"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-bold text-neutral-100">
                      {pick({ nameAr: ex.nameAr, nameFr: ex.nameFr, nameEn: ex.nameEn })}
                    </p>
                    {isPR && (
                      <span className="shrink-0 rounded bg-primary/15 px-1.5 py-0.5 text-[8.5px] font-black text-primary">
                        {t("exprog.prBadge")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[10.5px] font-semibold text-neutral-600 tabular-nums">
                    {t("exprog.lastTime")}: {stats.last.topSet.w > 0 ? `${stats.last.topSet.w}kg × ${stats.last.topSet.r}` : `${stats.last.topSet.r} × ${t("setlog.reps")}`} · {fmtDate(new Date(stats.last.date), { day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-display text-[16px] font-black text-primary tabular-nums">
                    {stats.best.topWeight > 0 ? `${stats.best.topWeight}` : `${stats.best.topSet.r}`}
                    <span className="ms-0.5 text-[9px] font-bold text-neutral-500">
                      {stats.best.topWeight > 0 ? "kg" : t("setlog.reps")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-[10px] font-bold tabular-nums",
                      trend === "up" && "text-success",
                      trend === "down" && "text-danger",
                      trend === "flat" && "text-neutral-600"
                    )}
                  >
                    {trend === "up" && <TrendingUp className="h-3.5 w-3.5" />}
                    {trend === "down" && <TrendingDown className="h-3.5 w-3.5" />}
                    {trend === "flat" && <Minus className="h-3.5 w-3.5" />}
                    {t("exprog.trend")}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
