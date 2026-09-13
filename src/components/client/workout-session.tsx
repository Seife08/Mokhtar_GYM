"use client";

/**
 * Workout session with SET-BY-SET logging (قاعدة تطبيقات Strong / Hevy):
 * every exercise card holds its set rows — weight × reps inputs with a
 * completion toggle. Checking a set starts the rest timer; an exercise is
 * "done" when all its sets are checked. On finish, per-set data is saved
 * as JSON and feeds the Exercise Progress page (volume, PRs, trends).
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Play,
  Pause,
  SkipForward,
  Plus,
  X,
  Timer as TimerIcon,
  Flame,
  Trophy,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  Info,
  Trash2,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { saveWorkoutLogAction } from "@/server-actions/client";

interface Ex {
  id: string;
  exerciseId: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  muscleGroup: string;
  equipment: string | null;
  emoji: string | null;
  instructionsAr: string | null;
  instructionsFr: string | null;
  instructionsEn: string | null;
  sets: number;
  reps: number;
  weight: number | null;
  restSeconds: number;
  tempo: string | null;
  notes: string | null;
}

interface Day {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  dayIndex: number;
}

interface SelectedDay extends Day {
  estMinutes: number;
  exercises: Ex[];
}

interface SetRow {
  w: string;
  r: string;
  done: boolean;
}

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

export function WorkoutSessionClient({
  clientWorkoutId,
  program,
  days,
  selectedDay,
  initialSets,
}: {
  clientWorkoutId: string;
  program: { nameEn: string; nameAr: string; nameFr: string; daysCount: number };
  days: Day[];
  selectedDay: SelectedDay;
  initialSets: Record<string, { w: number; r: number }[]>;
}) {
  const { t, pick } = useI18n();
  const router = useRouter();

  // per-exercise set rows (keyed by exerciseId — survives plan rebuilds)
  const [rows, setRows] = useState<Record<string, SetRow[]>>(() => {
    const init: Record<string, SetRow[]> = {};
    for (const ex of selectedDay.exercises) {
      const saved = initialSets[ex.exerciseId];
      if (saved && saved.length > 0) {
        init[ex.exerciseId] = saved.map((s) => ({
          w: String(s.w ?? ""),
          r: String(s.r ?? ""),
          done: true,
        }));
      } else {
        init[ex.exerciseId] = Array.from({ length: ex.sets }, () => ({
          w: ex.weight != null ? String(ex.weight) : "",
          r: String(ex.reps),
          done: false,
        }));
      }
    }
    return init;
  });

  const [showDone, setShowDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  // rest timer
  const [rest, setRest] = useState<{ left: number; total: number; running: boolean } | null>(null);

  // session clock
  const startRef = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  // countdown
  useEffect(() => {
    if (!rest?.running) return;
    const timer = setInterval(() => {
      setRest((r) => {
        if (!r) return r;
        if (r.left <= 1) return null; // finished
        return { ...r, left: r.left - 1 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rest?.running]);

  /* ================= set row actions ================= */

  const toggleSet = (ex: Ex, idx: number) => {
    setRows((prev) => {
      const list = prev[ex.exerciseId] ?? [];
      const row = list[idx];
      if (!row) return prev;
      const turningOn = !row.done;
      const next = list.map((r, i) => (i === idx ? { ...r, done: turningOn } : r));
      if (turningOn) {
        setRest({ left: ex.restSeconds, total: ex.restSeconds, running: true });
      }
      return { ...prev, [ex.exerciseId]: next };
    });
  };

  const patchRow = (ex: Ex, idx: number, patch: Partial<SetRow>) => {
    setRows((prev) => {
      const list = prev[ex.exerciseId] ?? [];
      return {
        ...prev,
        [ex.exerciseId]: list.map((r, i) => (i === idx ? { ...r, ...patch } : r)),
      };
    });
  };

  /* ▲/▼ stepper helper for the reps column — clamped 0…200,
     an empty cell steps from 0 (first press of ▲ gives 1) */
  const stepReps = (val: string, delta: number) =>
    String(Math.max(0, Math.min(200, (Number(val) || 0) + delta)));

  const addSet = (ex: Ex) => {
    setRows((prev) => {
      const list = prev[ex.exerciseId] ?? [];
      const last = list[list.length - 1];
      return {
        ...prev,
        [ex.exerciseId]: [
          ...list,
          { w: last?.w ?? (ex.weight != null ? String(ex.weight) : ""), r: last?.r ?? String(ex.reps), done: false },
        ],
      };
    });
  };

  const removeSet = (ex: Ex) => {
    setRows((prev) => {
      const list = prev[ex.exerciseId] ?? [];
      if (list.length <= 1) return prev;
      // remove the last not-done row, else the last row
      const idx = [...list].reverse().findIndex((r) => !r.done);
      const cut = idx === -1 ? list.length - 1 : list.length - 1 - idx;
      return { ...prev, [ex.exerciseId]: list.filter((_, i) => i !== cut) };
    });
  };

  /* ================= derived ================= */

  const exDone = (ex: Ex): boolean => {
    const list = rows[ex.exerciseId] ?? [];
    return list.length > 0 && list.every((r) => r.done);
  };

  const doneCount = selectedDay.exercises.filter(exDone).length;
  const doneSetsCount = Object.values(rows).reduce(
    (s, list) => s + list.filter((r) => r.done).length,
    0
  );
  const totalVolume = Object.values(rows).reduce(
    (s, list) => s + list.filter((r) => r.done).reduce((v, r) => v + (Number(r.w) || 0) * (Number(r.r) || 0), 0),
    0
  );

  const finish = async () => {
    const anySetDone = doneSetsCount > 0;
    if (!anySetDone) {
      toast.error(t("workout.noHistory"));
      return;
    }
    setSaving(true);
    try {
      const durationMin = Math.max(1, Math.round((Date.now() - startRef.current) / 60000));
      // sets data: only done rows
      const setsData: Record<string, { w: number; r: number }[]> = {};
      for (const ex of selectedDay.exercises) {
        const done = (rows[ex.exerciseId] ?? []).filter((r) => r.done);
        if (done.length > 0) {
          setsData[ex.exerciseId] = done.map((r) => ({
            w: Math.max(0, Number(r.w) || 0),
            r: Math.max(1, Number(r.r) || 1),
          }));
        }
      }
      const completedExerciseIds = selectedDay.exercises
        .filter((ex) => (rows[ex.exerciseId] ?? []).some((r) => r.done))
        .map((ex) => ex.exerciseId);
      const res = await saveWorkoutLogAction({
        clientWorkoutId,
        workoutDayId: selectedDay.id,
        completedExerciseIds,
        durationMin,
        setsData,
      });
      if (res.ok) {
        setShowDone(true);
      } else {
        toast.error(t("validation.serverError"));
      }
    } finally {
      setSaving(false);
    }
  };

  /* ================= completion screen ================= */
  if (showDone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.21, 0.6, 0.35, 1] }}
        className="flex min-h-[70vh] flex-col items-center justify-center text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 16 }}
          className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/40 bg-primary/10"
        >
          <Trophy className="h-11 w-11 text-primary" />
        </motion.div>
        <h1 className="font-display mt-7 text-2xl font-black tracking-wide gold-text">
          {t("workout.completeTitle")}
        </h1>
        <p className="mt-2 text-[15px] font-bold text-neutral-200">
          {t("workout.greatWork", { name: "" }).replace(/[!،,]/g, "")} 🔥
        </p>

        <div className="mt-7 grid w-full max-w-xs grid-cols-3 gap-2.5">
          <div className="surface-card rounded-xl p-3.5">
            <p className="font-display text-xl font-black text-primary tabular-nums">
              {doneSetsCount}
            </p>
            <p className="mt-1 text-[9px] font-bold text-neutral-500">{t("workout.sets")}</p>
          </div>
          <div className="surface-card rounded-xl p-3.5">
            <p className="font-display text-xl font-black text-primary tabular-nums">
              {Math.round(totalVolume).toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-[9px] font-bold text-neutral-500">{t("setlog.volume")}</p>
          </div>
          <div className="surface-card rounded-xl p-3.5">
            <p className="font-display text-xl font-black text-primary tabular-nums">
              {Math.max(1, Math.round((Date.now() - startRef.current) / 60000))}
            </p>
            <p className="mt-1 text-[9px] font-bold text-neutral-500">{t("common.minutes")}</p>
          </div>
        </div>

        <button
          onClick={() => router.push("/client/workouts")}
          className="animate-pulse-gold mt-9 h-12 w-full max-w-xs rounded-xl bg-primary text-[13px] font-extrabold tracking-wider text-black transition-all hover:bg-[#ffd700] active:scale-[0.98]"
        >
          {t("workout.saveWorkout")}
        </button>
      </motion.div>
    );
  }

  const dayName = pick({ nameAr: selectedDay.nameAr, nameFr: selectedDay.nameFr, nameEn: selectedDay.nameEn });
  const progressPct =
    selectedDay.exercises.length > 0
      ? Math.round((doneCount / selectedDay.exercises.length) * 100)
      : 0;

  return (
    <div className="pb-8">
      {/* ===== header ===== */}
      <div className="sticky top-14 z-30 -mx-4 surface-glass px-4 pb-3 pt-1">
        <div className="flex items-center gap-3">
          <Link
            href="/client/workouts"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5 rtl-flip" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-bold tracking-wide text-primary uppercase">
              {t("workout.session")} · {selectedDay.dayIndex + 1}/{program.daysCount}
            </p>
            <h1 className="font-display truncate text-[19px] font-black text-neutral-50">{dayName}</h1>
          </div>
          <span className="flex shrink-0 items-center gap-1 rounded-md bg-[#151515] px-2.5 py-1.5 text-[11px] font-bold text-neutral-300 tabular-nums">
            <TimerIcon className="h-3.5 w-3.5 text-primary" />
            {fmtClock(elapsed)}
          </span>
        </div>
        {/* progress bar */}
        <div className="mt-2.5 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/70">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #8A6500, #F5C400, #FFE066)",
              }}
            />
          </div>
          <span className="text-[10px] font-bold text-neutral-400 tabular-nums">
            {doneCount}/{selectedDay.exercises.length}
          </span>
        </div>
      </div>

      {/* day selector chips */}
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {days.map((d) => (
          <Link
            key={d.id}
            href={`/client/workouts/${clientWorkoutId}?day=${d.id}`}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-bold transition-colors",
              d.id === selectedDay.id
                ? "bg-primary text-black"
                : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
            )}
          >
            {pick({ nameAr: d.nameAr, nameFr: d.nameFr, nameEn: d.nameEn })}
          </Link>
        ))}
      </div>

      {/* ===== exercises with set rows ===== */}
      <div className="mt-4 space-y-3">
        {selectedDay.exercises.map((ex, i) => {
          const list = rows[ex.exerciseId] ?? [];
          const done = exDone(ex);
          const infoOpen = openInfo === ex.exerciseId;
          return (
            <motion.div
              layout
              key={ex.exerciseId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.22 }}
              className={cn(
                "surface-card overflow-hidden rounded-xl transition-colors",
                done && "border-success/30 bg-success/[0.04]"
              )}
            >
              {/* exercise header */}
              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setOpenInfo(infoOpen ? null : ex.exerciseId)}
                  className="flex flex-1 items-center gap-3 p-4 text-start"
                >
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 text-[17px] transition-colors",
                      done ? "border-success bg-success/15" : "border-neutral-700 bg-[#141414]"
                    )}
                  >
                    {ex.emoji ?? MUSCLE_EMOJI[ex.muscleGroup] ?? "⚡"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-[14px] font-bold transition-colors",
                        done ? "text-neutral-500 line-through" : "text-neutral-100"
                      )}
                    >
                      {pick({ nameAr: ex.nameAr, nameFr: ex.nameFr, nameEn: ex.nameEn })}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
                      <span className="font-semibold tabular-nums">
                        {ex.sets} × {ex.reps}
                      </span>
                      <span>{t(`enum.${ex.muscleGroup}` as DictKey)}</span>
                      {done && (
                        <span className="font-bold text-success">{t("setlog.done")} ✓</span>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenInfo(infoOpen ? null : ex.exerciseId)}
                  aria-label={t("workout.instructions")}
                  className="flex w-11 shrink-0 items-center justify-center border-s border-neutral-800/70 text-neutral-600 transition-colors hover:text-primary"
                >
                  <Info className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* ===== set rows ===== */}
              <div className="border-t border-neutral-800/60 px-3 pb-3 pt-2">
                {/* column labels */}
                <div className="mb-1 flex items-center gap-2 px-1 text-[9px] font-black uppercase tracking-wider text-neutral-700">
                  <span className="w-7 text-center">{t("setlog.set")}</span>
                  <span className="flex-1 text-center">{t("workout.weight")}</span>
                  <span className="flex-1 text-center">{t("setlog.reps")}</span>
                  <span className="w-9 text-center">✓</span>
                </div>
                <div className="space-y-1.5">
                  {list.map((row, idx) => (
                    <motion.div
                      key={idx}
                      initial={false}
                      animate={row.done ? { x: 0 } : {}}
                      className={cn(
                        "flex items-center gap-2 rounded-lg transition-colors",
                        row.done ? "bg-success/[0.07]" : "bg-[#0e0e0e]"
                      )}
                    >
                      <span className="w-7 text-center text-[11px] font-black text-neutral-500 tabular-nums">
                        {idx + 1}
                      </span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={500}
                        placeholder="—"
                        value={row.w}
                        onChange={(e) => patchRow(ex, idx, { w: e.target.value })}
                        className="h-9 flex-1 rounded-md border border-transparent bg-[#151515] text-center text-[13px] font-black text-neutral-100 tabular-nums placeholder:text-neutral-700 focus:border-primary/40 focus:outline-none"
                        aria-label={t("workout.weight")}
                      />
                      {/* reps stepper — ▲ raises, ▼ lowers */}
                      <div className="flex flex-1 items-center justify-center">
                        <button
                          type="button"
                          onClick={() => patchRow(ex, idx, { r: stepReps(row.r, -1) })}
                          aria-label={t("myplan.lowerReps")}
                          className="flex h-9 w-7 shrink-0 items-center justify-center rounded-md text-neutral-600 transition-colors hover:text-primary active:scale-90"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={200}
                          placeholder="—"
                          value={row.r}
                          onChange={(e) => patchRow(ex, idx, { r: e.target.value })}
                          className="h-9 w-12 rounded-md border border-transparent bg-[#151515] text-center text-[13px] font-black text-neutral-100 tabular-nums placeholder:text-neutral-700 focus:border-primary/40 focus:outline-none"
                          aria-label={t("setlog.reps")}
                        />
                        <button
                          type="button"
                          onClick={() => patchRow(ex, idx, { r: stepReps(row.r, 1) })}
                          aria-label={t("myplan.raiseReps")}
                          className="flex h-9 w-7 shrink-0 items-center justify-center rounded-md text-neutral-600 transition-colors hover:text-primary active:scale-90"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleSet(ex, idx)}
                        aria-pressed={row.done}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 transition-all active:scale-90",
                          row.done
                            ? "border-success bg-success text-black"
                            : "border-neutral-700 text-transparent hover:border-primary/60"
                        )}
                      >
                        <Check className="h-5 w-5" strokeWidth={3.5} />
                      </button>
                    </motion.div>
                  ))}
                </div>

                {/* add / remove set */}
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addSet(ex)}
                    className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-700 text-[11px] font-bold text-neutral-500 transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t("setlog.addSet")}
                  </button>
                  {list.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSet(ex)}
                      aria-label={t("myplan.remove")}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-800 text-neutral-600 transition-colors hover:border-danger/40 hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* expanded info */}
              <AnimatePresence initial={false}>
                {infoOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-neutral-800/70"
                  >
                    <div className="space-y-2 p-4 text-[12px] leading-relaxed text-neutral-400">
                      <p>
                        <span className="font-bold text-neutral-300">{t("workout.rest")}:</span>{" "}
                        {ex.restSeconds}s · <span className="font-bold text-neutral-300">{t("workout.tempo")}:</span>{" "}
                        {ex.tempo ?? "—"} ·{" "}
                        <span className="font-bold text-neutral-300">{t("admin.equipment")}:</span>{" "}
                        {ex.equipment ?? "—"}
                      </p>
                      <p>
                        {pick({
                          nameAr: ex.instructionsAr,
                          nameFr: ex.instructionsFr,
                          nameEn: ex.instructionsEn,
                        }) ?? "—"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* ===== rest timer dock ===== */}
      <AnimatePresence>
        {rest && (
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 90, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-x-0 bottom-[72px] z-40 px-4"
          >
            <div className="surface-glass mx-auto flex max-w-lg items-center gap-3 rounded-2xl border-primary/30 p-3.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)]">
              <div className="relative flex h-12 w-12 items-center justify-center">
                <svg viewBox="0 0 48 48" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="24" cy="24" r="21" fill="none" stroke="#262626" strokeWidth="4" />
                  <circle
                    cx="24" cy="24" r="21" fill="none" stroke="#F5C400" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 21}
                    strokeDashoffset={2 * Math.PI * 21 * (1 - rest.left / rest.total)}
                    className="transition-all duration-1000 ease-linear"
                  />
                </svg>
                <span className="text-[11px] font-black text-primary tabular-nums">
                  {rest.left}
                </span>
              </div>
              <span className="text-[11px] font-black tracking-[0.18em] text-neutral-400 uppercase">
                {t("workout.restTimer")}
              </span>
              <div className="ms-auto flex items-center gap-2">
                <button
                  onClick={() => setRest((r) => (r ? { ...r, running: !r.running } : r))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b1b1b] text-neutral-300 transition-colors hover:text-primary"
                  aria-label={rest.running ? t("workout.pause") : t("workout.resume")}
                >
                  {rest.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 rtl-flip" />}
                </button>
                <button
                  onClick={() => setRest((r) => (r ? { ...r, left: Math.min(r.total, r.left + 15), total: Math.max(r.total, r.left + 15) } : r))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b1b1b] text-neutral-300 transition-colors hover:text-primary"
                  aria-label="+15s"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setRest(null)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1b1b1b] text-neutral-300 transition-colors hover:text-primary"
                  aria-label={t("workout.skip")}
                >
                  <SkipForward className="h-4 w-4 rtl-flip" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== finish CTA ===== */}
      <div className="sticky bottom-24 mt-6">
        <button
          onClick={finish}
          disabled={saving || doneSetsCount === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-extrabold tracking-wider text-black shadow-[0_10px_30px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-[0.98] disabled:opacity-40"
        >
          <Flame className="h-5 w-5" />
          {saving ? t("common.saving") : t("workout.finishWorkout")}
        </button>
        {doneSetsCount > 0 && (
          <p className="mt-2 text-center text-[10.5px] font-bold text-neutral-500 tabular-nums">
            {doneSetsCount} {t("workout.sets")} · {Math.round(totalVolume).toLocaleString("en-US")} {t("setlog.volumeUnit")}
          </p>
        )}
      </div>
    </div>
  );
}

function fmtClock(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
