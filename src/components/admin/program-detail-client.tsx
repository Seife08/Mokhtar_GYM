"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronLeft, Loader2, X } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import {
  addWorkoutDayAction,
  removeWorkoutDayAction,
  addExerciseToDayAction,
  removeWorkoutExerciseAction,
} from "@/server-actions/admin-workouts";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MUSCLES = [
  "chest", "back", "shoulders", "biceps", "triceps",
  "legs", "glutes", "abs", "calves", "fullbody", "cardio",
] as const;

interface WExercise {
  id: string;
  exerciseId: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  muscleGroup: string;
  sets: number;
  reps: number;
  restSeconds: number;
  weight: number | null;
  tempo: string | null;
}

interface Day {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  dayIndex: number;
  focus: string | null;
  estMinutes: number;
  exercises: WExercise[];
}

export function ProgramDetailClient({
  program,
  days,
  exerciseDb,
}: {
  program: {
    id: string;
    nameEn: string;
    nameAr: string;
    nameFr: string;
    difficulty: string;
    goal: string | null;
    status: string;
  };
  days: Day[];
  exerciseDb: { id: string; nameEn: string; nameAr: string; nameFr: string; muscleGroup: string }[];
}) {
  const { t, pick } = useI18n();
  const router = useRouter();
  const [dayOpen, setDayOpen] = useState(false);
  const [exOpen, setExOpen] = useState<Day | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dayState, dayFormAction, dayPending] = useMgAction(addWorkoutDayAction, {
    onSuccess: () => {
      setDayOpen(false);
      toast.success(t("common.save"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [exState, exFormAction, exPending] = useMgAction(addExerciseToDayAction, {
    onSuccess: () => {
      setExOpen(null);
      toast.success(t("admin.exerciseSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [exFilter, setExFilter] = useState("");

  const removeDay = async (dayId: string) => {
    setBusyId(dayId);
    const res = await removeWorkoutDayAction(dayId);
    setBusyId(null);
    if (res.ok) {
      toast.success(t("common.delete"));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  const removeEx = async (weId: string) => {
    setBusyId(weId);
    const res = await removeWorkoutExerciseAction(weId);
    setBusyId(null);
    if (res.ok) {
      toast.success(t("common.delete"));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  const filteredExDb = exFilter
    ? exerciseDb.filter(
        (e) =>
          e.nameEn.toLowerCase().includes(exFilter.toLowerCase()) ||
          e.nameAr.includes(exFilter)
      ).slice(0, 12)
    : exerciseDb.slice(0, 12);

  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/workouts"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5 rtl-flip" />
          </Link>
          <div>
            <h1 className="font-display text-[22px] font-black tracking-tight text-neutral-50">
              {pick({ nameAr: program.nameAr, nameFr: program.nameFr, nameEn: program.nameEn })}
            </h1>
            <p className="mt-0.5 text-[11.5px] text-neutral-500">
              {program.difficulty} · {days.length} {t("workout.days")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDayOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.addDay")}
        </button>
      </div>

      {/* days */}
      <div className="space-y-4">
        {days.length === 0 && (
          <div className="surface-card rounded-2xl py-12 text-center text-[13px] text-neutral-600">
            {t("admin.noProgramsDesc")}
          </div>
        )}
        {days.map((day) => (
          <div key={day.id} id={`day-${day.id}`} className="surface-card rounded-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c1c1c] p-4">
              <div className="flex items-center gap-3">
                <span className="font-display flex h-9 w-9 items-center justify-center rounded-lg bg-[#1a1a1a] text-[13px] font-black text-primary">
                  {day.dayIndex + 1}
                </span>
                <div>
                  <h2 className="text-[15px] font-black text-neutral-50">
                    {pick({ nameAr: day.nameAr, nameFr: day.nameFr, nameEn: day.nameEn })}
                  </h2>
                  <p className="text-[10.5px] text-neutral-600">
                    {day.focus
                      ? day.focus.split(",").map((f) => t(`enum.${f}` as DictKey)).join(" · ")
                      : ""}{" "}
                    · {day.estMinutes} {t("common.minutes")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExOpen(day)}
                  className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-700 px-3 text-[11px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t("admin.addExercise")}
                </button>
                <button
                  onClick={() => removeDay(day.id)}
                  disabled={busyId === day.id}
                  aria-label={t("common.delete")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  {busyId === day.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* exercises */}
            {day.exercises.length === 0 ? (
              <p className="p-5 text-center text-[12px] text-neutral-600">{t("admin.noExercises")}</p>
            ) : (
              <div className="divide-y divide-[#161616]">
                {day.exercises.map((we, i) => (
                  <div key={we.id} className="flex items-center gap-3 p-3.5">
                    <span className="w-5 text-[11px] font-bold text-neutral-600 tabular-nums">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-neutral-200">
                        {pick({ nameAr: we.nameAr, nameFr: we.nameFr, nameEn: we.nameEn })}
                      </p>
                      <p className="text-[10.5px] text-neutral-600">
                        {t(`enum.${we.muscleGroup}` as DictKey)} · {we.sets}×{we.reps}
                        {we.weight ? ` · ${we.weight}kg` : ""} · {we.restSeconds}s
                        {we.tempo ? ` · ${we.tempo}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => removeEx(we.id)}
                      disabled={busyId === we.id}
                      aria-label={t("admin.remove")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      {busyId === we.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== add day dialog ===== */}
      <Dialog open={dayOpen} onOpenChange={setDayOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.addDay")}
            </DialogTitle>
          </DialogHeader>
          <form action={dayFormAction} className="space-y-4">
            <input type="hidden" name="programId" value={program.id} />
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="wd-en" name="nameEn" label="EN" placeholder="Chest & Triceps" required />
              <Field id="wd-ar" name="nameAr" label="AR" dir="rtl" placeholder="الصدر والترايسبس" required />
              <Field id="wd-fr" name="nameFr" label="FR" placeholder="Pectoraux" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="wd-focus" name="focus" label={t("admin.focus")} placeholder="chest,triceps" dir="ltr" />
              <Field
                id="wd-est"
                name="estMinutes"
                type="number"
                min="10"
                max="240"
                label={`${t("common.duration")} (${t("common.minutes")})`}
                defaultValue={60}
                dir="ltr"
              />
            </div>
            <SubmitButton pending={dayPending}>{t("common.add")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* ===== add exercise dialog ===== */}
      <Dialog open={!!exOpen} onOpenChange={(v) => !v && setExOpen(null)}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.addExercise")}
              {exOpen ? ` — ${pick({ nameAr: exOpen.nameAr, nameFr: exOpen.nameFr, nameEn: exOpen.nameEn })}` : ""}
            </DialogTitle>
          </DialogHeader>
          <form action={exFormAction} className="space-y-4">
            <input type="hidden" name="workoutDayId" value={exOpen?.id ?? ""} />
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-neutral-300">{t("admin.selectExercise")}</label>
              <input
                value={exFilter}
                onChange={(e) => setExFilter(e.target.value)}
                placeholder={t("admin.exerciseSearch")}
                className="input-premium h-10 w-full rounded-lg px-3.5 text-[13px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[#262626]">
                {filteredExDb.map((e) => (
                  <label
                    key={e.id}
                    className="flex cursor-pointer items-center gap-2.5 border-b border-[#1a1a1a] p-2.5 text-[12.5px] last:border-0 hover:bg-primary/5"
                  >
                    <input type="radio" name="exerciseId" value={e.id} required className="accent-[#F5C400]" />
                    <span className="flex-1 truncate font-semibold text-neutral-200">
                      {pick({ nameAr: e.nameAr, nameFr: e.nameFr, nameEn: e.nameEn })}
                    </span>
                    <span className="text-[9.5px] text-neutral-600">{t(`enum.${e.muscleGroup}` as DictKey)}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field id="we-sets" name="sets" type="number" min="1" max="10" label={t("admin.setsShort")} defaultValue={3} required dir="ltr" />
              <Field id="we-reps" name="reps" type="number" min="1" max="100" label={t("admin.repsShort")} defaultValue={10} required dir="ltr" />
              <Field id="we-rest" name="restSeconds" type="number" min="15" max="600" label={t("admin.restShort")} defaultValue={90} required dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="we-weight" name="weight" type="number" min="0" step="2.5" label={`${t("workout.weight")} (kg)`} dir="ltr" />
              <Field id="we-tempo" name="tempo" label={t("admin.tempo")} placeholder="2-0-1" dir="ltr" />
            </div>
            <SubmitButton pending={exPending}>{t("common.add")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
