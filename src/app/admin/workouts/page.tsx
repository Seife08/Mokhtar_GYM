import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { WorkoutsAdminClient } from "@/components/admin/workouts-client";

export const dynamic = "force-dynamic";

export default async function AdminWorkoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ assign?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { assign } = await searchParams;

  const [programs, assignments, clients] = await Promise.all([
    db.workoutProgram.findMany({
      include: {
        days: { orderBy: { dayIndex: "asc" }, include: { _count: { select: { exercises: true } } } },
        _count: { select: { clientWorkouts: { where: { status: "ACTIVE" } } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.clientWorkout.findMany({
      where: { status: "ACTIVE" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        program: { select: { nameEn: true, nameAr: true, nameFr: true } },
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
    <WorkoutsAdminClient
      programs={programs.map((p) => ({
        id: p.id,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        nameFr: p.nameFr,
        difficulty: p.difficulty,
        goal: p.goal,
        status: p.status,
        daysCount: p.days.length,
        totalExercises: p.days.reduce((s, d) => s + d._count.exercises, 0),
        days: p.days.map((d) => ({
          id: d.id,
          nameEn: d.nameEn,
          nameAr: d.nameAr,
          nameFr: d.nameFr,
          dayIndex: d.dayIndex,
          exerciseCount: d._count.exercises,
          estMinutes: d.estMinutes,
        })),
        assignedCount: p._count.clientWorkouts,
      }))}
      assignments={assignments.map((a) => ({
        id: a.id,
        memberId: a.user.id,
        memberName: `${a.user.firstName ?? ""} ${a.user.lastName ?? ""}`.trim(),
        programNameAr: a.program.nameAr,
        programNameFr: a.program.nameFr,
        programNameEn: a.program.nameEn,
        startDate: a.startDate.toISOString(),
      }))}
      clients={clients.map((c) => ({
        id: c.id,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      }))}
      openAssign={assign === "1"}
    />
  );
}
