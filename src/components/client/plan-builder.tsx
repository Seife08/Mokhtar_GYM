"use client";

/**
 * PlanBuilder — the member builds their own weekly program:
 * 1) pick training days (Mon…Sun chips)
 * 2) for each day add exercises from the library (emoji + favourites)
 * 3) fine-tune sets / reps / weight per exercise
 * Then save → saveCustomPlanAction.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Plus,
  Minus,
  X,
  Search,
  Check,
  Save,
  Zap,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  saveCustomPlanAction,
  toggleFavoriteExerciseAction,
} from "@/server-actions/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export interface LibraryExercise {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  muscleGroup: string;
  equipment: string | null;
  emoji: string | null;
  difficulty: string;
}

export interface DraftEx {
  exerciseId: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  muscleGroup: string;
  equipment: string | null;
  emoji: string | null;
  sets: number;
  reps: number;
  weight: string;
}

export interface InitialDay {
  dayOfWeek: number;
  exercises: {
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
}

const MUSCLES = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "legs",
  "glutes",
  "abs",
  "calves",
  "cardio",
];

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

export function PlanBuilder({
  initialDays,
  library,
  favorites: initialFavorites,
  onCancel,
  onSaved,
}: {
  initialDays: InitialDay[];
  library: LibraryExercise[];
  favorites: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t, pick } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // dayOfWeek -> exercise draft list
  const [draft, setDraft] = useState<Record<number, DraftEx[]>>(() => {
    const d: Record<number, DraftEx[]> = {};
    for (const day of initialDays) {
      d[day.dayOfWeek] = day.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        nameEn: e.nameEn,
        nameAr: e.nameAr,
        nameFr: e.nameFr,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        emoji: e.emoji,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight != null ? String(e.weight) : "",
      }));
    }
    return d;
  });

  const [favs, setFavs] = useState<Set<string>>(new Set(initialFavorites));
  const [pickerFor, setPickerFor] = useState<number | null>(null);

  const dayList = useMemo(() => Object.keys(draft).map(Number).sort((a, b) => a - b), [draft]);

  const toggleDay = (dow: number) => {
    setDraft((prev) => {
      const next = { ...prev };
      if (next[dow]) delete next[dow];
      else next[dow] = [];
      return next;
    });
  };

  const addExercise = (dow: number, ex: LibraryExercise) => {
    setDraft((prev) => {
      const list = prev[dow] ?? [];
      if (list.some((e) => e.exerciseId === ex.id)) return prev;
      return {
        ...prev,
        [dow]: [
          ...list,
          {
            exerciseId: ex.id,
            nameEn: ex.nameEn,
            nameAr: ex.nameAr,
            nameFr: ex.nameFr,
            muscleGroup: ex.muscleGroup,
            equipment: ex.equipment,
            emoji: ex.emoji,
            sets: 3,
            reps: 10,
            weight: "",
          },
        ],
      };
    });
  };

  const removeExercise = (dow: number, exerciseId: string) => {
    setDraft((prev) => ({
      ...prev,
      [dow]: (prev[dow] ?? []).filter((e) => e.exerciseId !== exerciseId),
    }));
  };

  const patchExercise = (dow: number, exerciseId: string, patch: Partial<DraftEx>) => {
    setDraft((prev) => ({
      ...prev,
      [dow]: (prev[dow] ?? []).map((e) =>
        e.exerciseId === exerciseId ? { ...e, ...patch } : e
      ),
    }));
  };

  const toggleFav = async (exerciseId: string) => {
    const next = new Set(favs);
    const had = next.has(exerciseId);
    if (had) next.delete(exerciseId);
    else next.add(exerciseId);
    setFavs(next);
    const res = await toggleFavoriteExerciseAction(exerciseId);
    if (!res.ok) {
      // revert on failure
      const revert = new Set(favs);
      if (had) revert.add(exerciseId);
      else revert.delete(exerciseId);
      setFavs(revert);
      toast.error(t("validation.serverError"));
    }
  };

  const totalExercises = dayList.reduce((s, d) => s + (draft[d]?.length ?? 0), 0);

  const save = () => {
    const days = dayList.map((dow) => ({
      dayOfWeek: dow,
      exercises: (draft[dow] ?? []).map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight.trim() === "" ? null : Math.max(0, Math.min(500, Number(e.weight))),
      })),
    }));
    const emptyDay = days.find((d) => d.exercises.length === 0);
    if (emptyDay) {
      toast.error(t("myplan.emptyDay"));
      return;
    }
    startTransition(async () => {
      const res = await saveCustomPlanAction({ days });
      if (res.ok) {
        toast.success(t("myplan.saved"));
        router.refresh();
        onSaved();
      } else {
        toast.error(t(res.error as never));
      }
    });
  };

  return (
    <div className="pb-6">
      {/* ===== step 1: training days ===== */}
      <section>
        <h2 className="font-display text-[16px] font-black text-neutral-50">
          {t("myplan.pickDays")}
        </h2>
        <p className="mt-1 text-[12px] text-neutral-500">{t("myplan.pickDaysDesc")}</p>
        <div className="mt-3.5 grid grid-cols-7 gap-1.5">
          {DAY_KEYS.map((key, i) => {
            const dow = i + 1;
            const active = !!draft[dow];
            return (
              <motion.button
                key={dow}
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleDay(dow)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center rounded-xl border text-center transition-colors",
                  active
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-neutral-800 bg-[#111] text-neutral-500 hover:border-neutral-600"
                )}
              >
                <span className="text-[12px] font-black">{t(key)}</span>
                {active && (
                  <Check className="mt-0.5 h-3.5 w-3.5" strokeWidth={3} />
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* ===== step 2: per-day exercises ===== */}
      {dayList.length > 0 && (
        <section className="mt-6 space-y-3">
          {dayList.map((dow) => {
            const list = draft[dow] ?? [];
            const label = t(DAY_KEYS[dow - 1]);
            return (
              <div key={dow} className="surface-card overflow-hidden rounded-2xl">
                {/* day header */}
                <div className="flex items-center justify-between border-b border-neutral-800/70 px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[12px] font-black text-primary">
                      {label}
                    </span>
                    <span className="text-[12px] font-bold text-neutral-400 tabular-nums">
                      {t("myplan.exCount", { n: list.length })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPickerFor(dow)}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[11px] font-extrabold text-black transition-colors hover:bg-[#ffd700] active:scale-95"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                    {t("myplan.add")}
                  </button>
                </div>

                {/* exercise rows */}
                {list.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => setPickerFor(dow)}
                    className="flex w-full items-center justify-center gap-2 py-6 text-[12.5px] font-semibold text-neutral-600 transition-colors hover:text-primary"
                  >
                    <Zap className="h-4 w-4" />
                    {t("myplan.tapToAdd")}
                  </button>
                ) : (
                  <div className="divide-y divide-neutral-800/60">
                    {list.map((ex) => (
                      <div key={ex.exerciseId} className="px-3.5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-[#141414] text-[16px]">
                            {ex.emoji ?? MUSCLE_EMOJI[ex.muscleGroup] ?? "⚡"}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13.5px] font-bold text-neutral-100">
                              {pick({ nameAr: ex.nameAr, nameFr: ex.nameFr, nameEn: ex.nameEn })}
                            </p>
                            <p className="mt-0.5 text-[10px] font-semibold text-neutral-600">
                              {t(`enum.${ex.muscleGroup}` as DictKey)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeExercise(dow, ex.exerciseId)}
                            aria-label={t("myplan.remove")}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {/* sets / reps / weight editor */}
                        <div className="mt-2.5 flex items-center gap-2">
                          {/* sets stepper */}
                          <div className="flex h-9 items-center rounded-lg border border-neutral-800 bg-[#0e0e0e]">
                            <button
                              type="button"
                              onClick={() =>
                                patchExercise(dow, ex.exerciseId, {
                                  sets: Math.max(1, ex.sets - 1),
                                })
                              }
                              className="flex h-full w-8 items-center justify-center text-neutral-500 transition-colors hover:text-primary"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-10 text-center text-[12px] font-black text-neutral-200 tabular-nums">
                              {ex.sets} × {ex.reps}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                patchExercise(dow, ex.exerciseId, {
                                  sets: Math.min(8, ex.sets + 1),
                                })
                              }
                              className="flex h-full w-8 items-center justify-center text-neutral-500 transition-colors hover:text-primary"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* reps stepper — ▲ raises, ▼ lowers */}
                          <div className="flex h-9 items-center rounded-lg border border-neutral-800 bg-[#0e0e0e]">
                            <button
                              type="button"
                              onClick={() =>
                                patchExercise(dow, ex.exerciseId, {
                                  reps: Math.max(1, ex.reps - 1),
                                })
                              }
                              aria-label={t("myplan.lowerReps")}
                              className="flex h-full w-7 items-center justify-center text-neutral-500 transition-colors hover:text-primary active:scale-90"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={50}
                              value={ex.reps}
                              onChange={(e) =>
                                patchExercise(dow, ex.exerciseId, {
                                  reps: Math.max(1, Math.min(50, Number(e.target.value) || 1)),
                                })
                              }
                              className="w-9 bg-transparent text-center text-[12px] font-black text-neutral-200 tabular-nums focus:outline-none"
                              aria-label={t("setlog.reps")}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                patchExercise(dow, ex.exerciseId, {
                                  reps: Math.min(50, ex.reps + 1),
                                })
                              }
                              aria-label={t("myplan.raiseReps")}
                              className="flex h-full w-7 items-center justify-center text-neutral-500 transition-colors hover:text-primary active:scale-90"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <span className="pe-2.5 text-[9.5px] font-bold text-neutral-600">
                              {t("setlog.reps")}
                            </span>
                          </div>

                          {/* weight */}
                          <label className="ms-auto flex h-9 items-center rounded-lg border border-neutral-800 bg-[#0e0e0e]">
                            <input
                              type="number"
                              inputMode="decimal"
                              min={0}
                              max={500}
                              placeholder="—"
                              value={ex.weight}
                              onChange={(e) =>
                                patchExercise(dow, ex.exerciseId, { weight: e.target.value })
                              }
                              className="w-12 bg-transparent text-center text-[12px] font-black text-neutral-200 tabular-nums placeholder:text-neutral-700 focus:outline-none"
                              aria-label={t("setlog.kg")}
                            />
                            <span className="pe-2.5 text-[9.5px] font-bold text-neutral-600">
                              {t("setlog.kg")}
                            </span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ===== actions ===== */}
      <div className="sticky bottom-24 mt-6 flex gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="h-12 flex-1 rounded-xl border border-neutral-800 text-[13px] font-bold text-neutral-400 transition-colors hover:border-neutral-600 active:scale-[0.98] disabled:opacity-50"
        >
          {t("common.cancel")}
        </button>
        <button
          type="button"
          onClick={save}
          disabled={pending || dayList.length === 0 || totalExercises === 0}
          className="flex h-12 flex-[2] items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-extrabold tracking-wider text-black shadow-[0_10px_30px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-[0.98] disabled:opacity-40"
        >
          <Save className="h-5 w-5" />
          {pending ? t("common.saving") : t("myplan.save")}
        </button>
      </div>

      {/* ===== exercise picker sheet ===== */}
      <ExercisePicker
        open={pickerFor !== null}
        onOpenChange={(o) => !o && setPickerFor(null)}
        library={library}
        favorites={favs}
        onToggleFav={toggleFav}
        alreadyAdded={pickerFor !== null ? new Set((draft[pickerFor] ?? []).map((e) => e.exerciseId)) : new Set()}
        onAdd={(ex) => pickerFor !== null && addExercise(pickerFor, ex)}
        dayLabel={pickerFor !== null ? t(DAY_KEYS[pickerFor - 1]) : ""}
      />
    </div>
  );
}

/* ================= exercise picker (bottom sheet) ================= */

function ExercisePicker({
  open,
  onOpenChange,
  library,
  favorites,
  onToggleFav,
  alreadyAdded,
  onAdd,
  dayLabel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  library: LibraryExercise[];
  favorites: Set<string>;
  onToggleFav: (id: string) => void;
  alreadyAdded: Set<string>;
  onAdd: (ex: LibraryExercise) => void;
  dayLabel: string;
}) {
  const { t, pick } = useI18n();
  const [source, setSource] = useState<"favorites" | "all">("all");
  const [muscle, setMuscle] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const favList = useMemo(
    () => library.filter((e) => favorites.has(e.id)),
    [library, favorites]
  );

  const list = useMemo(() => {
    let base = source === "favorites" ? favList : library;
    if (muscle) base = base.filter((e) => e.muscleGroup === muscle);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      base = base.filter(
        (e) =>
          e.nameEn.toLowerCase().includes(q) ||
          e.nameAr.includes(q) ||
          e.nameFr.toLowerCase().includes(q)
      );
    }
    // favourites first inside "all"
    if (source === "all") {
      base = [...base].sort((a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)));
    }
    return base;
  }, [source, favList, library, muscle, query, favorites]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[82dvh] max-w-lg rounded-t-2xl border-border/70 surface-elevated px-0 pb-2"
      >
        <SheetHeader className="px-4 pb-2 pt-1">
          <SheetTitle className="font-display flex items-center gap-2 text-[15px] font-black text-neutral-50">
            <Zap className="h-4 w-4 text-primary" />
            {t("myplan.library")}
            <span className="text-[11px] font-bold text-neutral-500">· {dayLabel}</span>
          </SheetTitle>
        </SheetHeader>

        {/* search */}
        <div className="px-4">
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("myplan.search")}
              className="h-10 w-full rounded-lg border border-neutral-800 bg-[#0e0e0e] ps-10 pe-4 text-[13.5px] text-neutral-100 placeholder:text-neutral-600 focus:border-primary/40 focus:outline-none"
            />
          </div>
        </div>

        {/* source + muscle filters */}
        <div className="mt-2.5 flex items-center gap-2 px-4">
          <div className="flex h-8 shrink-0 rounded-lg border border-neutral-800 bg-[#0e0e0e] p-0.5">
            {(
              [
                { v: "favorites", label: `♥ ${t("myplan.favorites")}` },
                { v: "all", label: t("common.all") },
              ] as const
            ).map((seg) => (
              <button
                key={seg.v}
                type="button"
                onClick={() => setSource(seg.v)}
                className={cn(
                  "rounded-md px-2.5 text-[11px] font-bold transition-colors",
                  source === seg.v ? "bg-primary text-black" : "text-neutral-500"
                )}
              >
                {seg.label}
              </button>
            ))}
          </div>
          <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setMuscle(null)}
              className={cn(
                "shrink-0 rounded-md px-2.5 py-1 text-[10.5px] font-bold transition-colors",
                !muscle ? "bg-primary/15 text-primary" : "bg-[#141414] text-neutral-500"
              )}
            >
              {t("common.all")}
            </button>
            {MUSCLES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscle(m === muscle ? null : m)}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-[10.5px] font-bold transition-colors",
                  muscle === m ? "bg-primary/15 text-primary" : "bg-[#141414] text-neutral-500"
                )}
              >
                {MUSCLE_EMOJI[m]} {t(`enum.${m}` as DictKey)}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        <div className="no-scrollbar mt-2 max-h-[46dvh] divide-y divide-neutral-800/50 overflow-y-auto">
          {list.length === 0 && (
            <p className="py-8 text-center text-[13px] text-neutral-600">{t("myplan.noExInDay")}</p>
          )}
          {list.map((ex) => {
            const added = alreadyAdded.has(ex.id);
            const fav = favorites.has(ex.id);
            return (
              <div key={ex.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 bg-[#141414] text-[18px]">
                  {ex.emoji ?? MUSCLE_EMOJI[ex.muscleGroup] ?? "⚡"}
                </span>
                <button
                  type="button"
                  onClick={() => onAdd(ex)}
                  className="min-w-0 flex-1 text-start"
                >
                  <p className="truncate text-[13.5px] font-bold text-neutral-100">
                    {pick({ nameAr: ex.nameAr, nameFr: ex.nameFr, nameEn: ex.nameEn })}
                  </p>
                  <p className="mt-0.5 text-[10.5px] font-semibold text-neutral-600">
                    {t(`enum.${ex.muscleGroup}` as DictKey)} · {ex.equipment ?? ""}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFav(ex.id)}
                  aria-label="favorite"
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                    fav ? "text-primary" : "text-neutral-600 hover:text-neutral-300"
                  )}
                >
                  <Heart className={cn("h-4.5 w-4.5", fav && "fill-primary")} />
                </button>
                <button
                  type="button"
                  onClick={() => onAdd(ex)}
                  aria-label={t("myplan.add")}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all active:scale-90",
                    added
                      ? "border border-success/40 bg-success/10 text-success"
                      : "bg-primary text-black hover:bg-[#ffd700]"
                  )}
                >
                  {added ? <Check className="h-4.5 w-4.5" strokeWidth={3} /> : <Plus className="h-4.5 w-4.5" strokeWidth={3} />}
                </button>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
