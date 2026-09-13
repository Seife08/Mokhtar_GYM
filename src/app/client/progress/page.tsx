import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { ProgressClient } from "@/components/client/progress-client";

export const dynamic = "force-dynamic";

export default async function ProgressPage() {
  const me = await requireClient();
  if (!me) return null;

  const [entries, photos, logs] = await Promise.all([
    db.progressEntry.findMany({
      where: { userId: me.id },
      orderBy: { date: "asc" },
    }),
    db.progressPhoto.findMany({
      where: { userId: me.id },
      orderBy: { date: "desc" },
    }),
    // completed sessions with per-set data — feeds the Exercise Progress tab
    db.workoutLog.findMany({
      where: { clientWorkout: { userId: me.id }, completedAt: { not: null } },
      include: { workoutDay: true },
      orderBy: { date: "asc" },
      take: 250,
    }),
  ]);

  // exercise ids referenced inside the sets JSON
  const exIds = new Set<string>();
  for (const log of logs) {
    if (!log.completedSets) continue;
    try {
      const parsed = JSON.parse(log.completedSets) as Record<string, unknown>;
      for (const key of Object.keys(parsed)) exIds.add(key);
    } catch {
      // legacy format — ignore
    }
  }
  const exercises = exIds.size
    ? await db.exercise.findMany({
        where: { id: { in: [...exIds] } },
        select: {
          id: true,
          nameEn: true,
          nameAr: true,
          nameFr: true,
          muscleGroup: true,
          emoji: true,
        },
      })
    : [];

  return (
    <ProgressClient
      entries={entries.map((e) => ({
        id: e.id,
        date: e.date.toISOString(),
        weight: e.weight,
        height: e.height,
        chest: e.chest,
        waist: e.waist,
        arms: e.arms,
        thighs: e.thighs,
        bodyFat: e.bodyFat,
        notes: e.notes,
      }))}
      photos={photos.map((p) => ({
        id: p.id,
        category: p.category as "front" | "side" | "back",
        dataPath: p.dataPath,
        date: p.date.toISOString(),
      }))}
      workoutLogs={logs.map((l) => ({
        id: l.id,
        date: l.date.toISOString(),
        durationMin: l.durationMin,
        setsJson: l.completedSets,
        dayNameEn: l.workoutDay.nameEn,
        dayNameAr: l.workoutDay.nameAr,
        dayNameFr: l.workoutDay.nameFr,
      }))}
      exercises={exercises.map((e) => ({
        id: e.id,
        nameEn: e.nameEn,
        nameAr: e.nameAr,
        nameFr: e.nameFr,
        muscleGroup: e.muscleGroup,
        emoji: e.emoji,
      }))}
    />
  );
}
