import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ProgramDetailClient } from "@/components/admin/program-detail-client";

export const dynamic = "force-dynamic";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { id } = await params;

  const program = await db.workoutProgram.findUnique({
    where: { id },
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
  });
  if (!program) notFound();

  const exercises = await db.exercise.findMany({
    where: { status: "ACTIVE" },
    orderBy: [{ muscleGroup: "asc" }, { nameEn: "asc" }],
  });

  return (
    <ProgramDetailClient
      program={{
        id: program.id,
        nameEn: program.nameEn,
        nameAr: program.nameAr,
        nameFr: program.nameFr,
        difficulty: program.difficulty,
        goal: program.goal,
        status: program.status,
      }}
      days={program.days.map((d) => ({
        id: d.id,
        nameEn: d.nameEn,
        nameAr: d.nameAr,
        nameFr: d.nameFr,
        dayIndex: d.dayIndex,
        focus: d.focus,
        estMinutes: d.estMinutes,
        exercises: d.exercises.map((we) => ({
          id: we.id,
          exerciseId: we.exerciseId,
          nameEn: we.exercise.nameEn,
          nameAr: we.exercise.nameAr,
          nameFr: we.exercise.nameFr,
          muscleGroup: we.exercise.muscleGroup,
          sets: we.sets,
          reps: we.reps,
          restSeconds: we.restSeconds,
          weight: we.weight,
          tempo: we.tempo,
        })),
      }))}
      exerciseDb={exercises.map((e) => ({
        id: e.id,
        nameEn: e.nameEn,
        nameAr: e.nameAr,
        nameFr: e.nameFr,
        muscleGroup: e.muscleGroup,
      }))}
    />
  );
}
