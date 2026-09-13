import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { DietClient } from "@/components/client/diet-client";

export const dynamic = "force-dynamic";

export default async function DietPage() {
  const me = await requireClient();
  if (!me) return null;

  const assignment = await db.clientDiet.findFirst({
    where: { userId: me.id, OR: [{ endDate: null }, { endDate: { gt: new Date() } }] },
    include: {
      dietPlan: {
        include: { meals: { orderBy: { orderIndex: "asc" } } },
      },
    },
    orderBy: { startDate: "desc" },
  });

  const plan = assignment?.dietPlan ?? null;

  return (
    <DietClient
      plan={
        plan
          ? {
              nameEn: plan.nameEn,
              nameAr: plan.nameAr,
              nameFr: plan.nameFr,
              goal: plan.goal,
              totalCalories: plan.totalCalories,
              meals: plan.meals.map((m) => ({
                id: m.id,
                type: m.type,
                time: m.time,
                foods: m.foods,
                calories: m.calories,
                protein: m.protein,
                carbs: m.carbs,
                fats: m.fats,
                notes: m.notes,
              })),
            }
          : null
      }
    />
  );
}
