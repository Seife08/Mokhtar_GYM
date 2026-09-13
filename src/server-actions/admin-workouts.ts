"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generateToken } from "@/lib/password";
import { membershipStatus } from "@/lib/membership";
import { z } from "zod";
import type { ActionResult } from "@/server-actions/auth";

async function audit(action: string, target?: string, entity?: string, metadata?: string) {
  const admin = await requireAdmin();
  if (!admin) return;
  await db.auditLog.create({
    data: { adminId: admin.id, action, target, entity, metadata },
  });
}

/* ================= ATTENDANCE / QR ================= */
export interface ScanResult {
  ok: boolean;
  error?: string;
  client?: {
    id: string;
    name: string;
    avatar: string | null;
    membershipStatus: string;
    planName: string | null;
    endDate: string | null;
    remainingDays: number | null;
  };
  checkinRecorded?: boolean;
  alreadyCheckedIn?: boolean;
}

export async function scanQrAction(token: string, override = false): Promise<ScanResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };

  const clean = token.trim().replace(/^MG1:/, "");
  if (!clean || clean.length < 5) return { ok: false, error: "admin.memberNotFound" };

  const user = await db.user.findUnique({
    where: { qrToken: clean },
    include: {
      memberships: {
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
        include: { plan: true },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      attendances: { orderBy: { checkInAt: "desc" }, take: 1 },
    },
  });
  if (!user || user.role !== "CLIENT") return { ok: false, error: "admin.memberNotFound" };
  if (user.status !== "ACTIVE") return { ok: false, error: "admin.inactiveAccount" };

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const m = user.memberships[0];
  let mStatus = "NONE";
  let planName: string | null = null;
  let endDate: string | null = null;
  let remainingDays: number | null = null;

  if (m) {
    mStatus = membershipStatus(m, settings?.expiringSoonDays ?? 7, settings?.gracePeriodDays ?? 0);
    planName = m.plan.nameEn;
    endDate = m.endDate.toISOString();
    remainingDays = Math.max(0, Math.ceil((new Date(m.endDate).getTime() - Date.now()) / 86400000));
  }

  const granted = override || (m && (mStatus === "ACTIVE" || mStatus === "EXPIRING_SOON"));

  // duplicate check-in protection
  let alreadyCheckedIn = false;
  if (user.attendances[0]) {
    const last = user.attendances[0].checkInAt;
    const minsSince = (Date.now() - new Date(last).getTime()) / 60000;
    if (minsSince < (settings?.doubleCheckinMins ?? 120)) {
      alreadyCheckedIn = true;
    }
  }

  let checkinRecorded = false;
  if (granted && !alreadyCheckedIn) {
    await db.attendance.create({
      data: { userId: user.id, method: "QR" },
    });
    checkinRecorded = true;
    revalidatePath("/admin/attendance");
    revalidatePath("/admin");
  }
  if (granted && !alreadyCheckedIn) {
    await audit("QR_CHECKIN", user.id, "Attendance", `QR scan ${user.firstName} ${user.lastName}`);
  }

  return {
    ok: true,
    client: {
      id: user.id,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
      avatar: user.avatar,
      membershipStatus: mStatus,
      planName,
      endDate,
      remainingDays,
    },
    checkinRecorded,
    alreadyCheckedIn,
  };
}

export async function manualCheckinAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "admin.selectMember" };

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const last = await db.attendance.findFirst({
    where: { userId },
    orderBy: { checkInAt: "desc" },
  });
  if (last) {
    const minsSince = (Date.now() - new Date(last.checkInAt).getTime()) / 60000;
    if (minsSince < (settings?.doubleCheckinMins ?? 120)) {
      return { ok: false, error: "admin.alreadyCheckedIn" };
    }
  }
  await db.attendance.create({ data: { userId, method: "MANUAL" } });
  await audit("MANUAL_CHECKIN", userId, "Attendance", user.firstName ?? "");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  return { ok: true };
}

export async function checkoutAction(attendanceId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  await db.attendance.update({
    where: { id: attendanceId, checkOutAt: null },
    data: { checkOutAt: new Date(), corrected: true },
  });
  revalidatePath("/admin/attendance");
  return { ok: true };
}

/* ================= WORKOUT PROGRAMS ================= */
const programSchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(2).max(80),
  nameFr: z.string().trim().min(2).max(80),
  description: z.string().optional(),
  goal: z.string().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
});

export async function saveProgramAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = (formData.get("id") as string) || "";
    const data = programSchema.parse({
      nameEn: formData.get("nameEn"),
      nameAr: formData.get("nameAr"),
      nameFr: formData.get("nameFr"),
      description: (formData.get("description") as string) || undefined,
      goal: (formData.get("goal") as string) || undefined,
      difficulty: (formData.get("difficulty") as string) || undefined,
    });
    if (id) {
      await db.workoutProgram.update({ where: { id }, data });
      await audit("PROGRAM_UPDATED", id, "WorkoutProgram");
    } else {
      await db.workoutProgram.create({ data });
      await audit("PROGRAM_CREATED", "", "WorkoutProgram", data.nameEn);
    }
    revalidatePath("/admin/workouts");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function archiveProgramAction(id: string, archive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  await db.workoutProgram.update({
    where: { id },
    data: { status: archive ? "ARCHIVED" : "ACTIVE" },
  });
  revalidatePath("/admin/workouts");
  return { ok: true };
}

const daySchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(2).max(80),
  nameFr: z.string().trim().min(2).max(80),
  focus: z.string().optional(),
  estMinutes: z.number().int().min(10).max(240).optional(),
});

export async function addWorkoutDayAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const programId = String(formData.get("programId"));
    const dayId = (formData.get("dayId") as string) || "";
    const data = daySchema.parse({
      nameEn: formData.get("nameEn"),
      nameAr: formData.get("nameAr"),
      nameFr: formData.get("nameFr"),
      focus: (formData.get("focus") as string) || undefined,
      estMinutes: Number(formData.get("estMinutes") || 60) || undefined,
    });
    if (dayId) {
      await db.workoutDay.update({ where: { id: dayId }, data });
    } else {
      const count = await db.workoutDay.count({ where: { programId } });
      await db.workoutDay.create({ data: { ...data, programId, dayIndex: count } });
    }
    revalidatePath(`/admin/workouts/${programId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function removeWorkoutDayAction(dayId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  const day = await db.workoutDay.findUnique({ where: { id: dayId } });
  if (!day) return { ok: false, error: "validation.serverError" };
  const logs = await db.workoutLog.count({ where: { workoutDayId: dayId } });
  if (logs > 0) return { ok: false, error: "validation.serverError" };
  await db.workoutExercise.deleteMany({ where: { workoutDayId: dayId } });
  await db.workoutDay.delete({ where: { id: dayId } });
  revalidatePath(`/admin/workouts/${day.programId}`);
  return { ok: true };
}

export async function addExerciseToDayAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const workoutDayId = String(formData.get("workoutDayId"));
    const exerciseId = String(formData.get("exerciseId"));
    const sets = z.number().int().min(1).max(10).parse(Number(formData.get("sets") || 3));
    const reps = z.number().int().min(1).max(100).parse(Number(formData.get("reps") || 10));
    const restSeconds = z.number().int().min(15).max(600).parse(Number(formData.get("restSeconds") || 90));
    const weight = Number(formData.get("weight")) || null;
    const tempo = (formData.get("tempo") as string) || null;

    const orderIndex = await db.workoutExercise.count({ where: { workoutDayId } });
    await db.workoutExercise.create({
      data: { workoutDayId, exerciseId, sets, reps, restSeconds, weight, tempo, orderIndex },
    });
    const day = await db.workoutDay.findUnique({ where: { id: workoutDayId } });
    revalidatePath(`/admin/workouts/${day?.programId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function removeWorkoutExerciseAction(weId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  const we = await db.workoutExercise.findUnique({ where: { id: weId } });
  if (!we) return { ok: false, error: "validation.serverError" };
  await db.workoutExercise.delete({ where: { id: weId } });
  const day = await db.workoutDay.findUnique({ where: { id: we.workoutDayId } });
  revalidatePath(`/admin/workouts/${day?.programId}`);
  return { ok: true };
}

export async function assignWorkoutAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const userId = String(formData.get("userId"));
    const programId = String(formData.get("programId"));
    const startDate = new Date(String(formData.get("startDate") || new Date().toISOString().slice(0, 10)));
    const endDateStr = (formData.get("endDate") as string) || "";
    const endDate = endDateStr ? new Date(endDateStr) : null;

    const user = await db.user.findUnique({ where: { id: userId } });
    const program = await db.workoutProgram.findUnique({ where: { id: programId } });
    if (!user || !program) return { ok: false, error: "validation.serverError" };

    await db.clientWorkout.updateMany({
      where: { userId, status: "ACTIVE" },
      data: { status: "CANCELLED" },
    });
    const cw = await db.clientWorkout.create({
      data: { userId, programId, startDate, endDate, status: "ACTIVE", assignedById: admin.id },
    });
    await db.notification.create({
      data: {
        userId, type: "workout",
        title: "New workout assigned",
        body: program.nameEn,
        link: "/client/workouts",
      },
    });
    await audit("WORKOUT_ASSIGNED", cw.id, "ClientWorkout", `${user.firstName} ${user.lastName}`);
    revalidatePath("/admin/workouts");
    revalidatePath("/client/workouts");
    return { ok: true };
  } catch {
    return { ok: false, error: "validation.serverError" };
  }
}

/* ================= EXERCISES ================= */
const exerciseSchema = z.object({
  nameEn: z.string().trim().min(2).max(80),
  nameAr: z.string().trim().min(2).max(80),
  nameFr: z.string().trim().min(2).max(80),
  muscleGroup: z.string().min(2),
  equipment: z.string().optional(),
  instructionsEn: z.string().optional(),
  instructionsAr: z.string().optional(),
  instructionsFr: z.string().optional(),
  difficulty: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]).optional(),
});

export async function saveExerciseAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = (formData.get("id") as string) || "";
    const data = exerciseSchema.parse({
      nameEn: formData.get("nameEn"),
      nameAr: formData.get("nameAr"),
      nameFr: formData.get("nameFr"),
      muscleGroup: formData.get("muscleGroup"),
      equipment: (formData.get("equipment") as string) || undefined,
      instructionsEn: (formData.get("instructionsEn") as string) || undefined,
      instructionsAr: (formData.get("instructionsAr") as string) || undefined,
      instructionsFr: (formData.get("instructionsFr") as string) || undefined,
      difficulty: (formData.get("difficulty") as string) || undefined,
    });
    if (id) {
      await db.exercise.update({ where: { id }, data });
    } else {
      await db.exercise.create({ data });
    }
    await audit(id ? "EXERCISE_UPDATED" : "EXERCISE_CREATED", id, "Exercise", data.nameEn);
    revalidatePath("/admin/exercises");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}
