"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { generateToken } from "@/lib/password";
import { membershipStatus, daysRemaining } from "@/lib/membership";
import { z } from "zod";
import type { ActionResult } from "@/server-actions/auth";

/* ================= QR TOKEN ================= */
export async function regenerateQrTokenAction(): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  await db.user.update({
    where: { id: me.id },
    data: { qrToken: generateToken(20) },
  });
  revalidatePath("/client/qr");
  return { ok: true };
}

/* ================= PROGRESS ================= */
const progressSchema = z.object({
  date: z.string(),
  weight: z.number().min(30).max(300).optional(),
  height: z.number().min(100).max(250).optional(),
  chest: z.number().min(30).max(200).optional(),
  waist: z.number().min(30).max(200).optional(),
  arms: z.number().min(10).max(100).optional(),
  thighs: z.number().min(20).max(150).optional(),
  bodyFat: z.number().min(2).max(70).optional(),
  notes: z.string().max(300).optional(),
});

export async function addProgressEntryAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  try {
    const num = (k: string) => {
      const v = formData.get(k);
      if (v === null || v === "") return undefined;
      const n = Number(v);
      return isNaN(n) ? undefined : n;
    };
    const data = progressSchema.parse({
      date: formData.get("date") ?? new Date().toISOString().slice(0, 10),
      weight: num("weight"),
      height: num("height"),
      chest: num("chest"),
      waist: num("waist"),
      arms: num("arms"),
      thighs: num("thighs"),
      bodyFat: num("bodyFat"),
      notes: (formData.get("notes") as string) || undefined,
    });
    if (
      data.weight === undefined &&
      data.chest === undefined &&
      data.waist === undefined &&
      data.arms === undefined &&
      data.thighs === undefined &&
      data.bodyFat === undefined &&
      data.height === undefined
    ) {
      return { ok: false, error: "validation.invalidAmount" };
    }
    await db.progressEntry.create({
      data: { userId: me.id, ...data, date: new Date(data.date) },
    });
    revalidatePath("/client/progress");
    return { ok: true };
  } catch {
    return { ok: false, error: "validation.serverError" };
  }
}

export async function addProgressPhotoAction(
  category: "front" | "side" | "back",
  dataUrl: string
): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  if (!dataUrl.startsWith("data:image/")) return { ok: false, error: "validation.invalidImage" };
  if (dataUrl.length > 2_500_000) return { ok: false, error: "validation.fileTooLarge" };
  await db.progressPhoto.create({
    data: { userId: me.id, category, dataPath: dataUrl.slice(0, 2_400_000) },
  });
  revalidatePath("/client/progress");
  return { ok: true };
}

export async function deleteProgressPhotoAction(
  photoId: string
): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  await db.progressPhoto.deleteMany({ where: { id: photoId, userId: me.id } });
  revalidatePath("/client/progress");
  return { ok: true };
}

/* ================= WORKOUT LOGGING ================= */
export async function saveWorkoutLogAction(input: {
  clientWorkoutId: string;
  workoutDayId: string;
  completedExerciseIds: string[];
  durationMin: number;
  calories?: number;
  /** per-exercise set details: {exerciseId: [{w: weight kg, r: reps}]} */
  setsData?: Record<string, { w: number; r: number }[]>;
}): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  const cw = await db.clientWorkout.findFirst({
    where: { id: input.clientWorkoutId, userId: me.id },
  });
  if (!cw) return { ok: false, error: "validation.unauthorized" };
  const day = await db.workoutDay.findFirst({
    where: { id: input.workoutDayId, programId: cw.programId },
  });
  if (!day) return { ok: false, error: "validation.unauthorized" };

  // sanitize sets data: only known exercises, sane numbers
  const cleanSets: Record<string, { w: number; r: number }[]> = {};
  if (input.setsData) {
    for (const [exId, sets] of Object.entries(input.setsData)) {
      if (!Array.isArray(sets) || sets.length === 0) continue;
      cleanSets[exId] = sets
        .filter((s) => s && Number.isFinite(s.w) && Number.isFinite(s.r))
        .map((s) => ({
          w: Math.max(0, Math.min(1000, Math.round(s.w * 10) / 10)),
          r: Math.max(0, Math.min(200, Math.round(s.r))),
        }))
        .filter((s) => s.r > 0);
      if (cleanSets[exId].length === 0) delete cleanSets[exId];
    }
  }

  // replace today's log if exists
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  await db.workoutLog.deleteMany({
    where: {
      clientWorkoutId: cw.id,
      workoutDayId: day.id,
      date: { gte: todayStart, lte: todayEnd },
    },
  });
  await db.workoutLog.create({
    data: {
      clientWorkoutId: cw.id,
      workoutDayId: day.id,
      date: new Date(),
      completedExercises: input.completedExerciseIds.join(","),
      completedSets: Object.keys(cleanSets).length > 0 ? JSON.stringify(cleanSets) : null,
      durationMin: Math.max(1, Math.round(input.durationMin)),
      calories: input.calories,
      completedAt: new Date(),
    },
  });
  revalidatePath("/client/workouts");
  revalidatePath("/client/progress");
  revalidatePath("/client");
  return { ok: true };
}

/* ================= CLASS BOOKINGS ================= */
export async function bookClassAction(classId: string): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };

  const fitnessClass = await db.fitnessClass.findUnique({
    where: { id: classId },
    include: { bookings: { where: { status: "BOOKED" } } },
  });
  if (!fitnessClass || fitnessClass.status === "CANCELLED") {
    return { ok: false, error: "validation.serverError" };
  }
  if (new Date(fitnessClass.date) < new Date()) {
    return { ok: false, error: "classes.past" };
  }

  // membership gate
  const memberships = await db.membership.findMany({
    where: { userId: me.id, status: "ACTIVE" },
  });
  const active = memberships.some(
    (m) => membershipStatus(m, 7, 0) !== "EXPIRED" && membershipStatus(m, 7, 0) !== "CANCELLED"
  );
  if (!active) return { ok: false, error: "classes.expiredMembership" };

  const existing = await db.booking.findUnique({
    where: { classId_userId: { classId, userId: me.id } },
  });
  if (existing?.status === "BOOKED") return { ok: false, error: "classes.alreadyBooked" };

  if (fitnessClass.bookings.length >= fitnessClass.capacity) {
    return { ok: false, error: "classes.bookingErrorFull" };
  }

  if (existing) {
    await db.booking.update({
      where: { id: existing.id },
      data: { status: "BOOKED", bookedAt: new Date(), cancelledAt: null },
    });
  } else {
    await db.booking.create({ data: { classId, userId: me.id, status: "BOOKED" } });
  }

  await db.notification.create({
    data: {
      userId: me.id,
      type: "class",
      title: "Booking confirmed",
      body: `${fitnessClass.nameEn} — see you there.`,
      link: "/client/classes",
    },
  });

  revalidatePath("/client/classes");
  revalidatePath("/client/bookings");
  return { ok: true };
}

export async function cancelBookingAction(bookingId: string): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };

  const booking = await db.booking.findFirst({
    where: { id: bookingId, userId: me.id, status: "BOOKED" },
    include: { fitnessClass: true },
  });
  if (!booking) return { ok: false, error: "validation.serverError" };

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const window = settings?.cancelWindowHours ?? 2;
  const classStart = new Date(booking.fitnessClass.date);
  const now = new Date();
  const hoursToClass = (classStart.getTime() - now.getTime()) / (1000 * 3600);
  if (hoursToClass < window) {
    return { ok: false, error: "classes.cannotCancel" };
  }

  await db.booking.update({
    where: { id: booking.id },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: me.id },
  });
  revalidatePath("/client/classes");
  revalidatePath("/client/bookings");
  return { ok: true };
}

/* ================= NOTIFICATIONS ================= */
export async function markNotificationReadAction(id: string): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  await db.notification.updateMany({
    where: { id, userId: me.id },
    data: { isRead: true },
  });
  revalidatePath("/client/notifications");
  revalidatePath("/client");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  await db.notification.updateMany({
    where: { userId: me.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/client/notifications");
  revalidatePath("/client");
  return { ok: true };
}

/* ================= PROFILE ================= */
export async function updateProfileAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  try {
    const firstName = z.string().trim().min(2).max(50).parse(formData.get("firstName"));
    const lastName = z.string().trim().min(2).max(50).parse(formData.get("lastName"));
    const phone = z
      .string()
      .trim()
      .regex(/^\+?[0-9\s-]{8,16}$/)
      .optional()
      .or(z.literal(""))
      .parse(formData.get("phone") ?? "");
    const avatar = (formData.get("avatar") as string) || null;
    const language = z.enum(["ar", "fr", "en"]).parse(formData.get("language") || me.language);

    await db.user.update({
      where: { id: me.id },
      data: {
        firstName,
        lastName,
        phone: phone || null,
        avatar: avatar ? avatar.slice(0, 400000) : me.avatar,
        language,
      },
    });
    revalidatePath("/client/profile");
    return { ok: true };
  } catch {
    return { ok: false, error: "validation.serverError" };
  }
}

export async function changePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  const { verifyPassword, hashPassword } = await import("@/lib/password");
  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user?.passwordHash) return { ok: false, error: "validation.serverError" };

  const current = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!verifyPassword(current, user.passwordHash)) {
    return { ok: false, error: "profile.wrongPassword" };
  }
  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return { ok: false, error: "validation.passwordWeak" };
  }
  if (newPassword !== confirm) return { ok: false, error: "validation.passwordsDontMatch" };

  await db.user.update({
    where: { id: me.id },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { ok: true };
}

export async function requestAccountDeletionAction(): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  const admins = await db.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" } });
  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: "general",
      title: "Account deletion request",
      body: `${me.firstName ?? ""} ${me.lastName ?? ""} (${me.email}) requested account deletion.`,
      link: `/admin/members/${me.id}`,
    })),
  });
  return { ok: true };
}

/* ================= SETTINGS ================= */
export async function updateLanguageAction(language: "ar" | "fr" | "en"): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  await db.user.update({ where: { id: me.id }, data: { language } });
  return { ok: true };
}

/* ================= EXERCISE FAVORITES ================= */
export async function toggleFavoriteExerciseAction(
  exerciseId: string
): Promise<ActionResult & { favorited?: boolean }> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  const ex = await db.exercise.findUnique({ where: { id: exerciseId }, select: { id: true } });
  if (!ex) return { ok: false, error: "validation.serverError" };
  const existing = await db.exerciseFavorite.findUnique({
    where: { userId_exerciseId: { userId: me.id, exerciseId } },
  });
  if (existing) {
    await db.exerciseFavorite.delete({ where: { id: existing.id } });
    return { ok: true, favorited: false };
  }
  await db.exerciseFavorite.create({ data: { userId: me.id, exerciseId } });
  return { ok: true, favorited: true };
}

/* ================= CUSTOM PLAN (الزبون يبني برنامجه) ================= */

const WEEKDAY_NAMES: Record<number, { en: string; ar: string; fr: string }> = {
  1: { en: "Monday", ar: "الاثنين", fr: "Lundi" },
  2: { en: "Tuesday", ar: "الثلاثاء", fr: "Mardi" },
  3: { en: "Wednesday", ar: "الأربعاء", fr: "Mercredi" },
  4: { en: "Thursday", ar: "الخميس", fr: "Jeudi" },
  5: { en: "Friday", ar: "الجمعة", fr: "Vendredi" },
  6: { en: "Saturday", ar: "السبت", fr: "Samedi" },
  7: { en: "Sunday", ar: "الأحد", fr: "Dimanche" },
};

const planDaySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        sets: z.number().int().min(1).max(8),
        reps: z.number().int().min(1).max(50),
        weight: z.number().min(0).max(500).nullable().optional(),
      })
    )
    .min(1)
    .max(12),
});

const customPlanSchema = z.object({
  days: z.array(planDaySchema).min(1).max(7),
});

export async function saveCustomPlanAction(
  input: z.infer<typeof customPlanSchema>
): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };

  let data: z.infer<typeof customPlanSchema>;
  try {
    data = customPlanSchema.parse(input);
  } catch {
    return { ok: false, error: "validation.serverError" };
  }

  // all exercise ids must exist & be ACTIVE
  const ids = [...new Set(data.days.flatMap((d) => d.exercises.map((e) => e.exerciseId)))];
  const valid = await db.exercise.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: { id: true },
  });
  if (valid.length !== ids.length) return { ok: false, error: "validation.serverError" };

  // no duplicate dayOfWeek
  const dows = data.days.map((d) => d.dayOfWeek);
  if (new Set(dows).size !== dows.length) return { ok: false, error: "validation.serverError" };

  // find or create the member's own program
  const existingProgram = await db.workoutProgram.findFirst({
    where: { createdById: me.id, status: "ACTIVE" },
    include: { days: true },
  });

  let programId: string;
  if (existingProgram) {
    programId = existingProgram.id;
    // wipe previous structure (logs reference days — remove them first)
    const dayIds = existingProgram.days.map((d) => d.id);
    if (dayIds.length > 0) {
      const cws = await db.clientWorkout.findMany({
        where: { programId: existingProgram.id },
        select: { id: true },
      });
      const cwIds = cws.map((c) => c.id);
      if (cwIds.length > 0) {
        await db.workoutLog.deleteMany({
          where: { OR: [{ workoutDayId: { in: dayIds } }, { clientWorkoutId: { in: cwIds } }] },
        });
        await db.clientWorkout.deleteMany({ where: { id: { in: cwIds } } });
      }
      await db.workoutExercise.deleteMany({ where: { workoutDayId: { in: dayIds } } });
      await db.workoutDay.deleteMany({ where: { id: { in: dayIds } } });
    }
    await db.workoutProgram.update({
      where: { id: existingProgram.id },
      data: { nameEn: "My Plan", nameAr: "برنامجي", nameFr: "Mon programme", updatedAt: new Date() },
    });
  } else {
    const created = await db.workoutProgram.create({
      data: {
        nameEn: "My Plan",
        nameAr: "برنامجي",
        nameFr: "Mon programme",
        difficulty: "INTERMEDIATE",
        createdById: me.id,
      },
    });
    programId = created.id;
  }

  // create days ordered by ISO day-of-week
  const sorted = [...data.days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  for (let i = 0; i < sorted.length; i++) {
    const d = sorted[i];
    const names = WEEKDAY_NAMES[d.dayOfWeek];
    const day = await db.workoutDay.create({
      data: {
        programId,
        dayIndex: i,
        dayOfWeek: d.dayOfWeek,
        nameEn: names.en,
        nameAr: names.ar,
        nameFr: names.fr,
        estMinutes: Math.min(120, 15 + d.exercises.reduce((s, e) => s + e.sets * 2.5, 0)),
      },
    });
    await db.workoutExercise.createMany({
      data: d.exercises.map((e, idx) => ({
        workoutDayId: day.id,
        exerciseId: e.exerciseId,
        orderIndex: idx,
        sets: e.sets,
        reps: e.reps,
        weight: e.weight ?? null,
        restSeconds: 90,
      })),
    });
  }

  // active assignment for the custom program
  const existing = await db.clientWorkout.findFirst({
    where: { userId: me.id, programId, status: "ACTIVE" },
  });
  if (!existing) {
    await db.clientWorkout.create({
      data: { userId: me.id, programId, startDate: new Date() },
    });
  }

  revalidatePath("/client/workouts");
  revalidatePath("/client");
  return { ok: true };
}

export async function clearCustomPlanAction(): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  const program = await db.workoutProgram.findFirst({
    where: { createdById: me.id, status: "ACTIVE" },
    include: { days: true },
  });
  if (!program) return { ok: true };
  const dayIds = program.days.map((d) => d.id);
  const cws = await db.clientWorkout.findMany({
    where: { programId: program.id },
    select: { id: true },
  });
  const cwIds = cws.map((c) => c.id);
  if (cwIds.length > 0) {
    await db.workoutLog.deleteMany({
      where: { OR: [{ workoutDayId: { in: dayIds } }, { clientWorkoutId: { in: cwIds } }] },
    });
    await db.clientWorkout.deleteMany({ where: { id: { in: cwIds } } });
  }
  if (dayIds.length > 0) {
    await db.workoutExercise.deleteMany({ where: { workoutDayId: { in: dayIds } } });
    await db.workoutDay.deleteMany({ where: { id: { in: dayIds } } });
  }
  await db.workoutProgram.delete({ where: { id: program.id } });
  revalidatePath("/client/workouts");
  revalidatePath("/client");
  return { ok: true };
}

/* ================= NFC CHECK-IN ================= */

export interface CheckinOutcome {
  ok: boolean;
  error?: string;
  outcome?: "CHECKED_IN" | "ALREADY" | "DENIED";
  name?: string;
  checkInAt?: string;
  monthVisits?: number;
  membershipStatus?: string;
}

export async function nfcCheckinAction(): Promise<CheckinOutcome> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };
  if (me.status !== "ACTIVE") {
    return { ok: true, outcome: "DENIED", name: me.firstName ?? "" };
  }

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const membership = await db.membership.findFirst({
    where: { userId: me.id, status: { in: ["ACTIVE", "PAUSED"] } },
    orderBy: { startDate: "desc" },
  });

  let mStatus = "NONE";
  if (membership) {
    mStatus = membershipStatus(membership, settings?.expiringSoonDays ?? 7, settings?.gracePeriodDays ?? 0);
  }

  if (mStatus !== "ACTIVE" && mStatus !== "EXPIRING_SOON") {
    return { ok: true, outcome: "DENIED", name: me.firstName ?? "", membershipStatus: mStatus };
  }

  // duplicate protection — same rule as the admin QR scanner
  const last = await db.attendance.findFirst({
    where: { userId: me.id },
    orderBy: { checkInAt: "desc" },
  });
  if (last) {
    const minsSince = (Date.now() - new Date(last.checkInAt).getTime()) / 60000;
    if (minsSince < (settings?.doubleCheckinMins ?? 120)) {
      const alreadyToday = new Date(last.checkInAt).toDateString() === new Date().toDateString();
      const monthVisits = await countMonthVisits(me.id);
      return {
        ok: true,
        outcome: "ALREADY",
        name: me.firstName ?? "",
        checkInAt: last.checkInAt.toISOString(),
        monthVisits,
        membershipStatus: mStatus,
        ...(alreadyToday ? {} : {}),
      };
    }
  }

  const rec = await db.attendance.create({
    data: { userId: me.id, method: "NFC" },
  });
  const monthVisits = await countMonthVisits(me.id);

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  revalidatePath("/client");
  revalidatePath("/client/qr");

  return {
    ok: true,
    outcome: "CHECKED_IN",
    name: me.firstName ?? "",
    checkInAt: rec.checkInAt.toISOString(),
    monthVisits,
    membershipStatus: mStatus,
  };
}

async function countMonthVisits(userId: string): Promise<number> {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return db.attendance.count({ where: { userId, checkInAt: { gte: start } } });
}

/* ================= CLIENT ACCOUNT (name / email / avatar) ================= */
const clientAccountSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email(),
  avatar: z
    .string()
    .refine(
      (v) =>
        v === "" || v === "__remove__" || (v.startsWith("data:image/") && v.length <= 400_000),
      { message: "validation.invalidAvatar" }
    )
    .optional()
    .or(z.literal("")),
});

export async function updateClientAccountAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const me = await requireClient();
  if (!me) return { ok: false, error: "validation.unauthorized" };

  try {
    const data = clientAccountSchema.parse({
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      avatar: String(formData.get("avatar") ?? ""),
    });

    const emailChanged = data.email !== me.email;
    if (emailChanged) {
      const clash = await db.user.findUnique({
        where: { email: data.email },
        select: { id: true },
      });
      if (clash && clash.id !== me.id) return { ok: false, error: "validation.emailExists" };
    }

    const avatarRaw = formData.get("avatar");
    let avatar: string | null | undefined;
    if (avatarRaw === "__remove__") avatar = null;
    else if (data.avatar) avatar = data.avatar;

    await db.user.update({
      where: { id: me.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        ...(avatar !== undefined ? { avatar } : {}),
      },
    });

    /* keep the session alive when the email inside the JWT changes */
    if (emailChanged) {
      const { signSession, SESSION_COOKIE, sessionCookieOptions } = await import("@/lib/session");
      const token = await signSession({ uid: me.id, role: "CLIENT", email: data.email });
      const store = await cookies();
      store.set(SESSION_COOKIE, token, sessionCookieOptions);
    }

    revalidatePath("/client/settings");
    revalidatePath("/client");
    revalidatePath("/client/profile");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}
