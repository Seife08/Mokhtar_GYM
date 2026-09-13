"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus, Trash2, Loader2, Flame } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { addMealAction, removeMealAction } from "@/server-actions/admin-content";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const MEAL_TYPES: { v: string; key: DictKey }[] = [
  { v: "breakfast", key: "diet.breakfast" },
  { v: "snack1", key: "diet.snack" },
  { v: "lunch", key: "diet.lunch" },
  { v: "snack2", key: "diet.snack" },
  { v: "dinner", key: "diet.dinner" },
];

interface Meal {
  id: string;
  type: string;
  time: string | null;
  foods: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fats: number | null;
  notes: string | null;
}

export function DietDetailClient({
  plan,
  meals,
}: {
  plan: { id: string; nameEn: string; nameAr: string; nameFr: string; totalCalories: number | null; goal: string | null };
  meals: Meal[];
}) {
  const { t, pick } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [state, formAction, pending] = useMgAction(addMealAction, {
    onSuccess: () => {
      setOpen(false);
      toast.success(t("common.save"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });

  const remove = async (id: string) => {
    setBusyId(id);
    const res = await removeMealAction(id);
    setBusyId(null);
    if (res.ok) {
      toast.success(t("common.delete"));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  const computedCal = meals.reduce((s, m) => s + (m.calories ?? 0), 0);
  const totalP = meals.reduce((s, m) => s + (m.protein ?? 0), 0);
  const totalC = meals.reduce((s, m) => s + (m.carbs ?? 0), 0);
  const totalF = meals.reduce((s, m) => s + (m.fats ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/diet-plans"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ChevronLeft className="h-5 w-5 rtl-flip" />
          </Link>
          <h1 className="font-display text-[22px] font-black tracking-tight text-neutral-50">
            {pick({ nameAr: plan.nameAr, nameFr: plan.nameFr, nameEn: plan.nameEn })}
          </h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.addMeal")}
        </button>
      </div>

      {/* macros summary */}
      <div className="surface-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5">
        <div>
          <p className="text-[10px] font-black tracking-wide text-neutral-500 uppercase">
            {t("admin.totalCalories")}
          </p>
          <p className="font-display mt-1 text-3xl font-black text-primary tabular-nums">
            {plan.totalCalories ?? computedCal}
            <span className="ms-1.5 text-[11px] font-bold text-neutral-500">{t("diet.kcal")}</span>
          </p>
        </div>
        <div className="flex gap-5 text-center">
          {[
            { label: t("diet.protein"), value: totalP, color: "text-success" },
            { label: t("diet.carbs"), value: totalC, color: "text-warning" },
            { label: t("diet.fats"), value: totalF, color: "text-danger" },
          ].map((m) => (
            <div key={m.label}>
              <p className={`font-display text-xl font-black tabular-nums ${m.color}`}>{m.value}g</p>
              <p className="text-[10px] font-bold text-neutral-600">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* meals */}
      {meals.length === 0 ? (
        <div className="surface-card rounded-2xl py-12 text-center text-[13px] text-neutral-600">
          {t("admin.meals")}: 0
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((m) => (
            <div key={m.id} className="surface-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-md bg-primary/10 px-2.5 py-1 text-[11px] font-black tracking-wide text-primary uppercase">
                    {t(MEAL_TYPES.find((mt) => mt.v === m.type)?.key ?? "diet.snack")}
                    {m.type === "snack2" ? " 2" : m.type === "snack1" ? " 1" : ""}
                  </span>
                  {m.time && (
                    <span className="text-[11px] font-semibold text-neutral-500 tabular-nums">{m.time}</span>
                  )}
                </div>
                <button
                  onClick={() => remove(m.id)}
                  disabled={busyId === m.id}
                  aria-label={t("common.delete")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-danger/10 hover:text-danger"
                >
                  {busyId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {m.foods.split("|").map((f, i) => (
                  <span key={i} className="rounded-lg bg-[#141414] px-2.5 py-1 text-[12px] text-neutral-300">
                    {f.trim()}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3 border-t border-[#181818] pt-2.5 text-[11px]">
                {m.calories != null && (
                  <span className="flex items-center gap-1 font-bold text-neutral-300 tabular-nums">
                    <Flame className="h-3.5 w-3.5 text-warning" />
                    {m.calories} {t("diet.kcal")}
                  </span>
                )}
                {m.protein != null && <span className="font-bold text-success tabular-nums">P {m.protein}g</span>}
                {m.carbs != null && <span className="font-bold text-warning tabular-nums">C {m.carbs}g</span>}
                {m.fats != null && <span className="font-bold text-danger tabular-nums">F {m.fats}g</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* add meal dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="surface-elevated max-h-[88dvh] overflow-y-auto border-border/70 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.addMeal")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="dietPlanId" value={plan.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field id="ml-type" name="type" label={t("admin.mealType")}>
                <select id="ml-type" name="type" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  {MEAL_TYPES.map((mt) => (
                    <option key={mt.v} value={mt.v}>
                      {t(mt.key)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="ml-time" name="time" type="time" label={t("admin.time")} />
            </div>
            <Field
              id="ml-foods"
              name="foods"
              label={t("admin.foods")}
              hint={t("admin.foodsHint")}
              placeholder="3 eggs|100g bread|1 banana"
              required
            />
            <div className="grid grid-cols-4 gap-2.5">
              <Field id="ml-cal" name="calories" type="number" min="0" label={t("diet.calories")} dir="ltr" />
              <Field id="ml-p" name="protein" type="number" min="0" label="P (g)" dir="ltr" />
              <Field id="ml-c" name="carbs" type="number" min="0" label="C (g)" dir="ltr" />
              <Field id="ml-f" name="fats" type="number" min="0" label="F (g)" dir="ltr" />
            </div>
            <Field id="ml-notes" name="notes" label={t("common.notes")} />
            <SubmitButton pending={pending}>{t("common.add")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
