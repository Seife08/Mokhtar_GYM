import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { WorkoutSessionClient } from "@/components/client/workout-session";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const me = await requireClient();
  if (!me) return null;
  const { id } = await params;
  const { day: dayParam } = await searchParams;

  const assignment = await db.clientWorkout.findFirst({
    where: { id, userId: me.id },
    include: {
      program: {
        include: {
          days: {
            orderBy: { dayIndex: "asc" },
            include: {
              exercises: {
                orderBy: { orderIndex: "asc" },
                include: { exercise: true },
              },
            },
          },
        },
      },
    },
  });
  if (!assignment) notFound();

  const days = assignment.program.days;
  const dayIdx = Math.max(0, dayIdx_default(assignment.startDate, days.length));
  const selected =
    days.find((d) => d.id === dayParam) ??
    days[dayIdx] ??
    days[0];

  // today's log only — used to resume an interrupted session (not last week's)
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  const lastLog = await db.workoutLog.findFirst({
    where: {
      clientWorkoutId: assignment.id,
      workoutDayId: selected.id,
      date: { gte: todayStart, lte: todayEnd },
      completedAt: { not: null },
    },
    orderBy: { date: "desc" },
  });

  const serializeExercise = (we: (typeof selected.exercises)[number]) => ({
    id: we.id,
    exerciseId: we.exerciseId,
    nameEn: we.exercise.nameEn,
    nameAr: we.exercise.nameAr,
    nameFr: we.exercise.nameFr,
    muscleGroup: we.exercise.muscleGroup,
    equipment: we.exercise.equipment,
    emoji: we.exercise.emoji,
    instructionsAr: we.exercise.instructionsAr,
    instructionsFr: we.exercise.instructionsFr,
    instructionsEn: we.exercise.instructionsEn,
    sets: we.sets,
    reps: we.reps,
    weight: we.weight,
    restSeconds: we.restSeconds,
    tempo: we.tempo,
    notes: we.notes,
  });

  return (
    <WorkoutSessionClient
      clientWorkoutId={assignment.id}
      program={{
        nameEn: assignment.program.nameEn,
        nameAr: assignment.program.nameAr,
        nameFr: assignment.program.nameFr,
        daysCount: days.length,
      }}
      days={days.map((d) => ({
        id: d.id,
        nameEn: d.nameEn,
        nameAr: d.nameAr,
        nameFr: d.nameFr,
        dayIndex: d.dayIndex,
      }))}
      selectedDay={{
        id: selected.id,
        nameEn: selected.nameEn,
        nameAr: selected.nameAr,
        nameFr: selected.nameFr,
        dayIndex: selected.dayIndex,
        estMinutes: selected.estMinutes,
        exercises: selected.exercises.map(serializeExercise),
      }}
      initialSets={parseSets(lastLog?.completedSets)}
    />
  );
}

function dayIdx_default(startDate: Date, daysCount: number): number {
  const daysSince = Math.max(0, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000));
  return daysCount > 0 ? daysSince % daysCount : 0;
}

/* completedSets JSON → {exerciseId: [{w, r}]} */
function parseSets(
  raw: string | null | undefined
): Record<string, { w: number; r: number }[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, { w: number; r: number }[]> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (Array.isArray(v)) {
        const sets = (v as { w?: unknown; r?: unknown }[])
          .map((s) => ({ w: Number(s?.w ?? 0), r: Number(s?.r ?? 0) }))
          .filter((s) => Number.isFinite(s.w) && Number.isFinite(s.r) && s.r > 0);
        if (sets.length > 0) out[k] = sets;
      }
    }
    return out;
  } catch {
    return {};
  }
}
