"use client";

import { Salad, Clock, Flame } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { PageHeader, EmptyState } from "./ui";
import { cn } from "@/lib/utils";

const MEAL_KEY: Record<string, DictKey> = {
  breakfast: "diet.breakfast",
  snack1: "diet.snack",
  snack2: "diet.snack",
  lunch: "diet.lunch",
  dinner: "diet.dinner",
};

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

export function DietClient({
  plan,
}: {
  plan: null | {
    nameEn: string;
    nameAr: string;
    nameFr: string;
    goal: string | null;
    totalCalories: number | null;
    meals: Meal[];
  };
}) {
  const { t, pick } = useI18n();

  if (!plan) {
    return (
      <div>
        <PageHeader title={t("diet.myDiet")} />
        <EmptyState icon={Salad} title={t("diet.noDiet")} desc={t("diet.noDietDesc")} />
      </div>
    );
  }

  const totalCal =
    plan.totalCalories ?? plan.meals.reduce((s, m) => s + (m.calories ?? 0), 0);

  return (
    <div>
      <PageHeader
        title={t("diet.myDiet")}
        subtitle={pick({ nameAr: plan.nameAr, nameFr: plan.nameFr, nameEn: plan.nameEn })}
      />

      {/* macros total */}
      <div className="surface-card card-sheen rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
              {t("diet.dailyTotal")}
            </p>
            <p className="font-display mt-1 text-3xl font-black text-primary tabular-nums">
              {totalCal}
              <span className="ms-1.5 text-[11px] font-bold text-neutral-500">{t("diet.kcal")}</span>
            </p>
          </div>
          <div className="flex gap-3 text-center">
            {[
              { label: t("diet.protein"), value: plan.meals.reduce((s, m) => s + (m.protein ?? 0), 0), color: "text-success" },
              { label: t("diet.carbs"), value: plan.meals.reduce((s, m) => s + (m.carbs ?? 0), 0), color: "text-warning" },
              { label: t("diet.fats"), value: plan.meals.reduce((s, m) => s + (m.fats ?? 0), 0), color: "text-danger" },
            ].map((m) => (
              <div key={m.label}>
                <p className={cn("font-display text-lg font-black tabular-nums", m.color)}>{m.value}g</p>
                <p className="text-[9px] font-bold text-neutral-600">{m.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* meals */}
      <div className="relative mt-5 space-y-3 ps-5">
        <div className="absolute bottom-4 start-[7px] top-4 w-px bg-gradient-to-b from-primary/40 via-neutral-800 to-transparent" />
        {plan.meals.map((meal, i) => {
          const foods = meal.foods.split("|").filter(Boolean);
          return (
            <div key={meal.id} className="relative">
              <span className="absolute -start-5 top-6 h-3.5 w-3.5 rounded-full border-2 border-[#080808] bg-primary" />
              <div className="surface-card animate-fade-up rounded-xl p-4" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="flex items-center justify-between">
                  <p className="font-display text-[14px] font-black tracking-wide text-primary uppercase">
                    {t(MEAL_KEY[meal.type] ?? "diet.snack")}
                  </p>
                  {meal.time && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-neutral-500 tabular-nums">
                      <Clock className="h-3.5 w-3.5" />
                      {meal.time}
                    </span>
                  )}
                </div>

                <ul className="mt-3 space-y-1.5">
                  {foods.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-[13px] text-neutral-300">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                      {f.trim()}
                    </li>
                  ))}
                </ul>

                {(meal.calories || meal.protein) && (
                  <div className="mt-3 flex items-center gap-3 border-t border-neutral-800/70 pt-2.5 text-[11px]">
                    {meal.calories != null && (
                      <span className="flex items-center gap-1 font-bold text-neutral-300 tabular-nums">
                        <Flame className="h-3.5 w-3.5 text-warning" />
                        {meal.calories} {t("diet.kcal")}
                      </span>
                    )}
                    {meal.protein != null && <span className="text-success font-bold tabular-nums">P {meal.protein}g</span>}
                    {meal.carbs != null && <span className="text-warning font-bold tabular-nums">C {meal.carbs}g</span>}
                    {meal.fats != null && <span className="text-danger font-bold tabular-nums">F {meal.fats}g</span>}
                  </div>
                )}

                {meal.notes && (
                  <p className="mt-2 text-[11px] italic text-neutral-600">{meal.notes}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-5 rounded-lg border border-neutral-800 bg-[#0d0d0d] p-3 text-center text-[10.5px] leading-relaxed text-neutral-600">
        {t("diet.disclaimer")}
      </p>
    </div>
  );
}
