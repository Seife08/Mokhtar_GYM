import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ExercisesClient } from "@/components/admin/exercises-client";

export const dynamic = "force-dynamic";

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string; q?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { group, q } = await searchParams;

  const where: Record<string, unknown> = {};
  if (group) where.muscleGroup = group;
  if (q) {
    where.OR = [
      { nameEn: { contains: q } },
      { nameAr: { contains: q } },
      { nameFr: { contains: q } },
    ];
  }

  const exercises = await db.exercise.findMany({
    where,
    include: { _count: { select: { workoutExercises: true } } },
    orderBy: [{ muscleGroup: "asc" }, { nameEn: "asc" }],
  });

  const groups = await db.exercise.groupBy({
    by: ["muscleGroup"],
    _count: { muscleGroup: true },
  });

  return (
    <ExercisesClient
      exercises={exercises.map((e) => ({
        id: e.id,
        nameEn: e.nameEn,
        nameAr: e.nameAr,
        nameFr: e.nameFr,
        muscleGroup: e.muscleGroup,
        equipment: e.equipment,
        difficulty: e.difficulty,
        usageCount: e._count.workoutExercises,
      }))}
      groupCounts={Object.fromEntries(groups.map((g) => [g.muscleGroup, g._count.muscleGroup]))}
      activeGroup={group ?? "all"}
      search={q ?? ""}
    />
  );
}
