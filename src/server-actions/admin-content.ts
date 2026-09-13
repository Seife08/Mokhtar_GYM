"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { z } from "zod";
import type { ActionResult } from "@/server-actions/auth";

async function audit(action: string, target?: string, entity?: string, metadata?: string) {
  const admin = await requireAdmin();
  if (!admin) return;
  await db.auditLog.create({
    data: { adminId: admin.id, action, target, entity, metadata },
  });
}

/* ================= DIET PLANS ================= */
export async function saveDietPlanAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = (formData.get("id") as string) || "";
    const nameEn = z.string().trim().min(2).parse(formData.get("nameEn"));
    const nameAr = z.string().trim().min(2).parse(formData.get("nameAr"));
    const nameFr = z.string().trim().min(2).parse(formData.get("nameFr"));
    const goal = (formData.get("goal") as string) || null;
    const description = (formData.get("description") as string) || null;
    const totalCalories = Number(formData.get("totalCalories")) || null;

    if (id) {
      await db.dietPlan.update({
        where: { id },
        data: { nameEn, nameAr, nameFr, goal, description, totalCalories },
      });
    } else {
      await db.dietPlan.create({
        data: { nameEn, nameAr, nameFr, goal, description, totalCalories, status: "ACTIVE" },
      });
    }
    revalidatePath("/admin/diet-plans");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function addMealAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const dietPlanId = String(formData.get("dietPlanId"));
    const mealId = (formData.get("mealId") as string) || "";
    const type = z.enum(["breakfast", "snack1", "lunch", "snack2", "dinner"]).parse(formData.get("type"));
    const time = (formData.get("time") as string) || null;
    const foods = z.string().trim().min(3).parse(formData.get("foods"));
    const calories = Number(formData.get("calories")) || null;
    const protein = Number(formData.get("protein")) || null;
    const carbs = Number(formData.get("carbs")) || null;
    const fats = Number(formData.get("fats")) || null;
    const notes = (formData.get("notes") as string) || null;

    const data = { type, time, foods, calories, protein, carbs, fats, notes };
    if (mealId) {
      await db.meal.update({ where: { id: mealId }, data });
    } else {
      const count = await db.meal.count({ where: { dietPlanId } });
      await db.meal.create({ data: { ...data, dietPlanId, orderIndex: count } });
    }
    revalidatePath(`/admin/diet-plans/${dietPlanId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function removeMealAction(mealId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  const meal = await db.meal.findUnique({ where: { id: mealId } });
  if (!meal) return { ok: false, error: "validation.serverError" };
  await db.meal.delete({ where: { id: mealId } });
  revalidatePath(`/admin/diet-plans/${meal.dietPlanId}`);
  return { ok: true };
}

export async function assignDietAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  const userId = String(formData.get("userId"));
  const dietPlanId = String(formData.get("dietPlanId"));
  const user = await db.user.findUnique({ where: { id: userId } });
  const plan = await db.dietPlan.findUnique({ where: { id: dietPlanId } });
  if (!user || !plan) return { ok: false, error: "validation.serverError" };

  await db.clientDiet.updateMany({
    where: { userId, endDate: null },
    data: { endDate: new Date() },
  });
  await db.clientDiet.create({ data: { userId, dietPlanId, startDate: new Date() } });
  await db.notification.create({
    data: {
      userId, type: "diet",
      title: "New diet plan assigned",
      body: plan.nameEn,
      link: "/client/diet",
    },
  });
  await audit("DIET_ASSIGNED", dietPlanId, "ClientDiet", user.firstName ?? "");
  revalidatePath("/admin/diet-plans");
  revalidatePath("/client/diet");
  return { ok: true };
}

/* ================= CLASSES ================= */
export async function saveClassAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = (formData.get("id") as string) || "";
    const nameEn = z.string().trim().min(2).parse(formData.get("nameEn"));
    const nameAr = z.string().trim().min(2).parse(formData.get("nameAr"));
    const nameFr = z.string().trim().min(2).parse(formData.get("nameFr"));
    const dateStr = z.string().min(10).parse(formData.get("date"));
    const timeStr = z.string().min(3).parse(formData.get("time") || "18:00");
    const durationMin = z.number().int().min(20).max(240).parse(Number(formData.get("durationMin") || 60));
    const capacity = z.number().int().min(1).max(100).parse(Number(formData.get("capacity") || 20));
    const instructor = (formData.get("instructor") as string) || null;
    const description = (formData.get("description") as string) || null;

    const [y, mo, d] = dateStr.split("-").map(Number);
    const [h, mi] = timeStr.split(":").map(Number);
    const date = new Date(y, mo - 1, d, h || 18, mi || 0);

    const data = { nameEn, nameAr, nameFr, date, durationMin, capacity, instructor, description };
    let classId = id;
    if (id) {
      await db.fitnessClass.update({ where: { id }, data });
    } else {
      const c = await db.fitnessClass.create({ data: { ...data, status: "SCHEDULED" } });
      classId = c.id;
    }
    await audit("CLASS_SAVED", classId, "FitnessClass", nameEn);
    revalidatePath("/admin/classes");
    revalidatePath("/client/classes");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function cancelClassAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  const cls = await db.fitnessClass.findUnique({
    where: { id },
    include: { bookings: { where: { status: "BOOKED" }, include: { user: true } } },
  });
  if (!cls) return { ok: false, error: "validation.serverError" };

  await db.fitnessClass.update({ where: { id }, data: { status: "CANCELLED" } });
  await db.booking.updateMany({
    where: { classId: id, status: "BOOKED" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelledBy: admin.id },
  });
  if (cls.bookings.length > 0) {
    await db.notification.createMany({
      data: cls.bookings.map((b) => ({
        userId: b.userId,
        type: "class",
        title: "Class cancelled",
        body: `${cls.nameEn} has been cancelled.`,
        link: "/client/classes",
      })),
    });
  }
  await audit("CLASS_CANCELLED", id, "FitnessClass");
  revalidatePath("/admin/classes");
  revalidatePath("/client/classes");
  return { ok: true };
}

/* ================= OFFERS ================= */
export async function saveOfferAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = (formData.get("id") as string) || "";
    const title = z.string().trim().min(3).max(120).parse(formData.get("title"));
    const description = (formData.get("description") as string) || null;
    const planId = (formData.get("planId") as string) || null;
    const originalPrice = Number(formData.get("originalPrice")) || null;
    const offerPrice = z.number().min(0).parse(Number(formData.get("offerPrice")));
    const startDate = new Date(String(formData.get("startDate") || new Date().toISOString().slice(0, 10)));
    const endDateStr = String(formData.get("endDate") || "");
    if (!endDateStr) return { ok: false, error: "validation.invalidDate" };
    const endDate = new Date(endDateStr);
    if (endDate <= startDate) return { ok: false, error: "validation.invalidDate" };

    const data = { title, description, planId, originalPrice, offerPrice, startDate, endDate };
    if (id) {
      await db.offer.update({ where: { id }, data });
    } else {
      const offer = await db.offer.create({ data: { ...data, status: "ACTIVE" } });
      await audit("OFFER_CREATED", offer.id, "Offer", title);
    }
    revalidatePath("/admin/offers");
    revalidatePath("/client/offers");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function archiveOfferAction(id: string, archive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  await db.offer.update({
    where: { id },
    data: { status: archive ? "ARCHIVED" : "ACTIVE" },
  });
  revalidatePath("/admin/offers");
  return { ok: true };
}

/* ================= ANNOUNCEMENTS ================= */
export async function saveAnnouncementAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = (formData.get("id") as string) || "";
    const title = z.string().trim().min(3).max(150).parse(formData.get("title"));
    const body = z.string().trim().min(5).parse(formData.get("body"));
    const priority = z.enum(["HIGH", "NORMAL", "LOW"]).parse(formData.get("priority") || "NORMAL");
    const startDate = new Date(String(formData.get("startDate") || new Date().toISOString().slice(0, 10)));
    const endDateStr = (formData.get("endDate") as string) || "";
    const endDate = endDateStr ? new Date(endDateStr) : null;

    const data = { title, body, priority, startDate, endDate };
    let annId = id;
    if (id) {
      await db.announcement.update({ where: { id }, data });
    } else {
      const a = await db.announcement.create({
        data: { ...data, status: "PUBLISHED" },
      });
      annId = a.id;
    }
    await audit("ANNOUNCEMENT_SAVED", annId, "Announcement", title);

    // optionally notify all members
    if (formData.get("sendNotification") === "on" && !id) {
      const members = await db.user.findMany({
        where: { role: "CLIENT", status: "ACTIVE" },
        select: { id: true },
      });
      if (members.length > 0) {
        await db.notification.createMany({
          data: members.map((m) => ({
            userId: m.id,
            type: "announcement",
            title,
            body,
            link: "/client/announcements",
          })),
        });
      }
    }
    revalidatePath("/admin/announcements");
    revalidatePath("/client/announcements");
    revalidatePath("/client");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function archiveAnnouncementAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  await db.announcement.update({ where: { id }, data: { status: "ARCHIVED" } });
  revalidatePath("/admin/announcements");
  return { ok: true };
}

/* ================= SEND NOTIFICATIONS ================= */
export async function sendNotificationAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult & { count?: number }> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const target = z.enum(["ALL", "ACTIVE", "EXPIRING", "INDIVIDUAL"]).parse(formData.get("target"));
    const title = z.string().trim().min(3).max(120).parse(formData.get("title"));
    const message = z.string().trim().min(3).max(500).parse(formData.get("message"));

    let userIds: string[] = [];
    if (target === "INDIVIDUAL") {
      const userId = String(formData.get("userId") || "");
      if (!userId) return { ok: false, error: "admin.selectMember" };
      userIds = [userId];
    } else {
      const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
      const expDays = settings?.expiringSoonDays ?? 7;
      const members = await db.user.findMany({
        where: { role: "CLIENT", status: "ACTIVE" },
        include: {
          memberships: { where: { status: "ACTIVE" }, orderBy: { startDate: "desc" }, take: 1 },
        },
      });
      userIds = members
        .filter((m) => {
          if (target === "ALL") return true;
          const mem = m.memberships[0];
          if (!mem) return target !== "ACTIVE";
          const status = (new Date(mem.endDate) > new Date()) ? "ACTIVE" : "EXPIRED";
          if (target === "ACTIVE") return status === "ACTIVE";
          if (target === "EXPIRING") {
            const daysLeft = Math.ceil((new Date(mem.endDate).getTime() - Date.now()) / 86400000);
            return daysLeft <= expDays && daysLeft >= 0;
          }
          return false;
        })
        .map((m) => m.id);
    }

    if (userIds.length === 0) return { ok: false, error: "admin.noMembers" };

    await db.notification.createMany({
      data: userIds.map((uid) => ({
        userId: uid,
        type: "general",
        title,
        body: message,
      })),
    });
    await audit("NOTIFICATION_SENT", "", "Notification", `${target} · ${userIds.length} users`);
    revalidatePath("/admin/notifications");
    revalidatePath("/client/notifications");
    return { ok: true, count: userIds.length };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

/* ================= SETTINGS ================= */
export async function saveSettingsAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const data: Record<string, string | number | boolean | null> = {};
    const str = (k: string, fallback?: string | null) => {
      const v = formData.get(k);
      if (v === null) return fallback ?? null;
      return String(v) || null;
    };
    const int = (k: string, fallback: number) => {
      const v = Number(formData.get(k));
      return isNaN(v) ? fallback : Math.floor(v);
    };

    await db.gymSettings.upsert({
      where: { id: "main" },
      update: {
        gymName: str("gymName", "MOKHTAR GYM") ?? "MOKHTAR GYM",
        phone: str("phone"),
        whatsapp: str("whatsapp"),
        address: str("address"),
        mapsUrl: str("mapsUrl"),
        hours: str("hours"),
        facebook: str("facebook"),
        instagram: str("instagram"),
        tiktok: str("tiktok"),
        defaultLang: str("defaultLang", "ar") ?? "ar",
        currency: str("currency", "DZD") ?? "DZD",
        timezone: str("timezone", "Africa/Algiers") ?? "Africa/Algiers",
        expiringSoonDays: int("expiringSoonDays", 7),
        gracePeriodDays: int("gracePeriodDays", 0),
        doubleCheckinMins: int("doubleCheckinMins", 120),
        cancelWindowHours: int("cancelWindowHours", 2),
        setupCompleted: true,
      },
      create: { id: "main", setupCompleted: true },
    });
    await audit("SETTINGS_UPDATED", "main", "GymSettings");
    revalidatePath("/admin/settings");
    revalidatePath("/client/gym-info");
    return { ok: true };
  } catch {
    return { ok: false, error: "validation.serverError" };
  }
}
