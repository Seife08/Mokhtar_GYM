"use client";

import { useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Search, AppWindow } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { EmptyState } from "@/components/client/ui";
import { saveExerciseAction } from "@/server-actions/admin-workouts";
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

interface EItem {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  muscleGroup: string;
  equipment: string | null;
  difficulty: string;
  usageCount: number;
}

export function ExercisesClient({
  exercises,
  groupCounts,
  activeGroup,
  search,
}: {
  exercises: EItem[];
  groupCounts: Record<string, number>;
  activeGroup: string;
  search: string;
}) {
  const { t, pick } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useMgAction(saveExerciseAction, {
    onSuccess: () => {
      setOpen(false);
      toast.success(t("admin.exerciseSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSearch = (v: string) => {
    setQuery(v);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (v) params.set("q", v);
      else params.delete("q");
      router.push(`${pathname}?${params}`);
    }, 320);
  };

  const setGroup = (g: string) => {
    const params = new URLSearchParams(searchParams);
    if (g === "all") params.delete("group");
    else params.set("group", g);
    router.push(`${pathname}?${params}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.exercises")}
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.createExercise")}
        </button>
      </div>

      {/* search + groups */}
      <div className="surface-card rounded-2xl p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-neutral-600" />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("admin.exerciseSearch")}
            className="input-premium h-11 w-full rounded-lg ps-11 pe-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
          />
        </div>
        <div className="no-scrollbar mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setGroup("all")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
              activeGroup === "all"
                ? "bg-primary text-black"
                : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
            )}
          >
            {t("common.all")} ({Object.values(groupCounts).reduce((s, v) => s + v, 0)})
          </button>
          {MUSCLES.map((m) => (
            <button
              key={m}
              onClick={() => setGroup(m)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                activeGroup === m
                  ? "bg-primary text-black"
                  : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
              )}
            >
              {t(`enum.${m}` as DictKey)} ({groupCounts[m] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {/* grid */}
      {exercises.length === 0 ? (
        <EmptyState icon={AppWindow} title={t("admin.noExercises")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {exercises.map((e) => (
            <div key={e.id} className="surface-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[14px] font-bold text-neutral-100">
                  {pick({ nameAr: e.nameAr, nameFr: e.nameFr, nameEn: e.nameEn })}
                </h3>
                <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {t(`enum.${e.muscleGroup}` as DictKey)}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-600">
                {e.nameEn} · {e.nameFr}
              </p>
              <div className="mt-2.5 flex items-center justify-between border-t border-[#181818] pt-2.5">
                <span className="text-[10.5px] text-neutral-600">
                  {e.equipment ?? "—"} · {e.difficulty}
                </span>
                <span className="text-[10.5px] font-bold text-neutral-400">
                  {e.usageCount}× {t("admin.order")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* new dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="surface-elevated max-h-[88dvh] overflow-y-auto border-border/70 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.createExercise")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="ex-en" name="nameEn" label="EN" placeholder="Bench Press" required />
              <Field id="ex-ar" name="nameAr" label="AR" dir="rtl" placeholder="بنش برس" required />
              <Field id="ex-fr" name="nameFr" label="FR" placeholder="Développé" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="ex-mg" name="muscleGroup" label={t("admin.muscleGroup")}>
                <select id="ex-mg" name="muscleGroup" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  {MUSCLES.map((m) => (
                    <option key={m} value={m}>
                      {t(`enum.${m}` as DictKey)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="ex-eq" name="equipment" label={t("admin.equipment")} placeholder="Barbell" />
            </div>
            <Field id="ex-diff" name="difficulty" label={t("admin.difficulty")}>
              <select id="ex-diff" name="difficulty" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                <option value="BEGINNER">{t("enum.beginner")}</option>
                <option value="INTERMEDIATE">{t("enum.intermediate")}</option>
                <option value="ADVANCED">{t("enum.advanced")}</option>
              </select>
            </Field>
            <Field id="ex-ins-en" name="instructionsEn" label={`${t("workout.instructions")} EN`} />
            <Field id="ex-ins-ar" name="instructionsAr" label={`${t("workout.instructions")} AR`} dir="rtl" />
            <Field id="ex-ins-fr" name="instructionsFr" label={`${t("workout.instructions")} FR`} />
            <SubmitButton pending={pending}>{t("common.create")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
