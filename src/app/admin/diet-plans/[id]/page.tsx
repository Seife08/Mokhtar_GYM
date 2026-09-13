import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DietDetailClient } from "@/components/admin/diet-detail-client";

export const dynamic = "force-dynamic";

export default async function DietPlanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { id } = await params;

  const plan = await db.dietPlan.findUnique({
    where: { id },
    include: { meals: { orderBy: { orderIndex: "asc" } } },
  });
  if (!plan) notFound();

  return (
    <DietDetailClient
      plan={{
        id: plan.id,
        nameEn: plan.nameEn,
        nameAr: plan.nameAr,
        nameFr: plan.nameFr,
        totalCalories: plan.totalCalories,
        goal: plan.goal,
      }}
      meals={plan.meals.map((m) => ({
        id: m.id,
        type: m.type,
        time: m.time,
        foods: m.foods,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fats: m.fats,
        notes: m.notes,
      }))}
    />
  );
}
