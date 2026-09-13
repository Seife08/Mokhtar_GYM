import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { WorkoutsClient } from "@/components/client/workouts-client";

export const dynamic = "force-dynamic";

export default async function WorkoutsPage() {
  const me = await requireClient();
  if (!me) return null;

  const [assignments, customProgram, library, favoriteRows] = await Promise.all([
    db.clientWorkout.findMany({
      where: { userId: me.id, status: "ACTIVE", program: { createdById: null } },
      include: {
        program: {
          include: {
            days: { orderBy: { dayIndex: "asc" }, include: { _count: { select: { exercises: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.workoutProgram.findFirst({
      where: { createdById: me.id, status: "ACTIVE" },
      include: {
        days: {
          orderBy: { dayIndex: "asc" },
          include: {
            exercises: { orderBy: { orderIndex: "asc" }, include: { exercise: true } },
          },
        },
      },
    }),
    db.exercise.findMany({
      where: { status: "ACTIVE" },
      orderBy: [{ muscleGroup: "asc" }, { nameEn: "asc" }],
      select: {
        id: true,
        nameEn: true,
        nameAr: true,
        nameFr: true,
        muscleGroup: true,
        equipment: true,
        emoji: true,
        difficulty: true,
      },
    }),
    db.exerciseFavorite.findMany({
      where: { userId: me.id },
      select: { exerciseId: true },
    }),
  ]);

  // custom plan assignment (clientWorkout row) if the plan exists
  const customCw = customProgram
    ? await db.clientWorkout.findFirst({
        where: { userId: me.id, programId: customProgram.id, status: "ACTIVE" },
      })
    : null;

  const logs = await db.workoutLog.findMany({
    where: { clientWorkout: { userId: me.id }, completedAt: { not: null } },
    include: { workoutDay: true, clientWorkout: { include: { program: true } } },
    orderBy: { date: "desc" },
    take: 20,
  });

  // today's day rotation per assignment
  const todayLogged = new Set(
    (
      await db.workoutLog.findMany({
        where: {
          clientWorkout: { userId: me.id },
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        select: { clientWorkoutId: true },
      })
    ).map((l) => l.clientWorkoutId)
  );

  const isoToday = new Date().getDay() === 0 ? 7 : new Date().getDay();

  const programs = assignments.map((a) => {
    const daysSince = Math.max(0, Math.floor((Date.now() - new Date(a.startDate).getTime()) / 86400000));
    const dayIdx = a.program.days.length > 0 ? daysSince % a.program.days.length : 0;
    const day = a.program.days[dayIdx];
    return {
      id: a.id,
      programId: a.program.id,
      nameEn: a.program.nameEn,
      nameAr: a.program.nameAr,
      nameFr: a.program.nameFr,
      difficulty: a.program.difficulty,
      goal: a.program.goal,
      daysCount: a.program.days.length,
      totalExercises: a.program.days.reduce((s, d) => s + d._count.exercises, 0),
      startDate: a.startDate.toISOString(),
      todayDayId: day?.id ?? null,
      todayDayNameEn: day?.nameEn ?? "",
      todayDayNameAr: day?.nameAr ?? "",
      todayDayNameFr: day?.nameFr ?? "",
      todayDayIndex: dayIdx,
      workedOutToday: todayLogged.has(a.id),
    };
  });

  const customPlan = customProgram
    ? {
        programId: customProgram.id,
        clientWorkoutId: customCw?.id ?? null,
        days: customProgram.days.map((d) => ({
          id: d.id,
          dayOfWeek: d.dayOfWeek ?? (d.dayIndex % 7) + 1,
          nameEn: d.nameEn,
          nameAr: d.nameAr,
          nameFr: d.nameFr,
          exercises: d.exercises.map((we) => ({
            weId: we.id,
            exerciseId: we.exerciseId,
            nameEn: we.exercise.nameEn,
            nameAr: we.exercise.nameAr,
            nameFr: we.exercise.nameFr,
            muscleGroup: we.exercise.muscleGroup,
            equipment: we.exercise.equipment,
            emoji: we.exercise.emoji,
            sets: we.sets,
            reps: we.reps,
            weight: we.weight,
          })),
        })),
        workedOutToday: customCw ? todayLogged.has(customCw.id) : false,
        todayDayId: customProgram.days.find((d) => d.dayOfWeek === isoToday)?.id ?? null,
      }
    : null;

  const history = logs.map((l) => ({
    id: l.id,
    date: l.date.toISOString(),
    durationMin: l.durationMin,
    dayNameEn: l.workoutDay.nameEn,
    dayNameAr: l.workoutDay.nameAr,
    dayNameFr: l.workoutDay.nameFr,
    programNameEn: l.clientWorkout.program.nameEn,
    programNameAr: l.clientWorkout.program.nameAr,
    programNameFr: l.clientWorkout.program.nameFr,
  }));

  return (
    <WorkoutsClient
      programs={programs}
      history={history}
      customPlan={customPlan}
      library={library}
      favorites={favoriteRows.map((f) => f.exerciseId)}
      isoToday={isoToday}
    />
  );
}
