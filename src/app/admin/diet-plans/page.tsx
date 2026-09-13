import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { DietPlansClient } from "@/components/admin/diet-client";

export const dynamic = "force-dynamic";

export default async function DietPlansPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const [plans, clients] = await Promise.all([
    db.dietPlan.findMany({
      include: {
        meals: { orderBy: { orderIndex: "asc" }, select: { id: true, calories: true } },
        _count: { select: { clientDiets: { where: { endDate: null } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.user.findMany({
      where: { role: "CLIENT", status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <DietPlansClient
      plans={plans.map((p) => ({
        id: p.id,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        nameFr: p.nameFr,
        goal: p.goal,
        totalCalories: p.totalCalories,
        status: p.status,
        mealCount: p.meals.length,
        computedCalories: p.meals.reduce((s, m) => s + (m.calories ?? 0), 0),
        assignedCount: p._count.clientDiets,
      }))}
      clients={clients.map((c) => ({
        id: c.id,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      }))}
    />
  );
}
