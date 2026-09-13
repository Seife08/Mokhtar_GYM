"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
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

/* ================= MEMBERS ================= */
const memberSchema = z.object({
  firstName: z.string().trim().min(2).max(50),
  lastName: z.string().trim().min(2).max(50),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().optional().or(z.literal("")),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "undisclosed"]).optional(),
  language: z.enum(["ar", "fr", "en"]).optional(),
});

export async function createMemberAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const data = memberSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: (formData.get("phone") as string) || "",
      dob: (formData.get("dob") as string) || undefined,
      gender: (formData.get("gender") as string) || undefined,
    });

    // password: provided or generated default
    const password = String(formData.get("password") || "") || "Member@2026";

    const exists = await db.user.findUnique({ where: { email: data.email } });
    if (exists) return { ok: false, error: "auth.accountExists" };

    const user = await db.user.create({
      data: {
        ...data,
        phone: data.phone || null,
        dob: data.dob ? new Date(data.dob) : null,
        passwordHash: hashPassword(password),
        role: "CLIENT",
        onboarding: true,
        qrToken: generateToken(20),
      },
    });

    // optional membership creation
    const planId = (formData.get("planId") as string) || "";
    if (planId) {
      const plan = await db.membershipPlan.findUnique({ where: { id: planId } });
      if (plan) {
        const startStr = (formData.get("startDate") as string) || new Date().toISOString().slice(0, 10);
        const startDate = new Date(startStr);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + plan.durationDays);
        await db.membership.create({
          data: {
            userId: user.id, planId: plan.id, startDate, endDate,
            pricePaid: plan.price, status: "ACTIVE", createdById: admin.id,
          },
        });
        await db.payment.create({
          data: {
            userId: user.id, amount: plan.price,
            method: (formData.get("paymentMethod") as string) || "CASH",
            status: "PAID", paidAt: startDate, recordedById: admin.id,
          },
        });
      }
    }

    await audit("MEMBER_CREATED", user.id, "User", `${data.firstName} ${data.lastName}`);
    revalidatePath("/admin/members");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function updateMemberAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = String(formData.get("id"));
    const data = memberSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: (formData.get("phone") as string) || "",
      dob: (formData.get("dob") as string) || undefined,
      gender: (formData.get("gender") as string) || undefined,
    });
    const exists = await db.user.findFirst({
      where: { email: data.email, NOT: { id } },
    });
    if (exists) return { ok: false, error: "auth.accountExists" };

    await db.user.update({
      where: { id },
      data: {
        ...data,
        phone: data.phone || null,
        dob: data.dob ? new Date(data.dob) : null,
      },
    });
    await audit("MEMBER_UPDATED", id, "User");
    revalidatePath("/admin/members");
    revalidatePath(`/admin/members/${id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function setMemberStatusAction(
  userId: string,
  status: "ACTIVE" | "INACTIVE"
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  await db.user.update({ where: { id: userId }, data: { status } });
  await audit(status === "ACTIVE" ? "MEMBER_REACTIVATED" : "MEMBER_DEACTIVATED", userId, "User");
  revalidatePath("/admin/members");
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true };
}

/* ================= MEMBERSHIP PLANS ================= */
const planSchema = z.object({
  nameEn: z.string().trim().min(2).max(60),
  nameAr: z.string().trim().min(2).max(60),
  nameFr: z.string().trim().min(2).max(60),
  descriptionEn: z.string().optional(),
  descriptionAr: z.string().optional(),
  descriptionFr: z.string().optional(),
  durationDays: z.number().int().min(1).max(2000),
  price: z.number().min(0).max(10_000_000),
  features: z.string().optional(),
  sortOrder: z.number().int().min(0).max(100).optional(),
});

function parsePlan(formData: FormData) {
  return planSchema.parse({
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameFr: formData.get("nameFr"),
    descriptionEn: (formData.get("descriptionEn") as string) || undefined,
    descriptionAr: (formData.get("descriptionAr") as string) || undefined,
    descriptionFr: (formData.get("descriptionFr") as string) || undefined,
    durationDays: Number(formData.get("durationDays")),
    price: Number(formData.get("price")),
    features: (formData.get("features") as string) || undefined,
    sortOrder: Number(formData.get("sortOrder") || 0) || undefined,
  });
}

export async function savePlanAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const id = (formData.get("id") as string) || "";
    const data = parsePlan(formData);
    if (id) {
      await db.membershipPlan.update({ where: { id }, data });
      await audit("PLAN_UPDATED", id, "MembershipPlan");
    } else {
      await db.membershipPlan.create({ data });
      await audit("PLAN_CREATED", "", "MembershipPlan", data.nameEn);
    }
    revalidatePath("/admin/plans");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: "validation.invalidAmount" };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function archivePlanAction(id: string, archive: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  await db.membershipPlan.update({
    where: { id },
    data: { status: archive ? "ARCHIVED" : "ACTIVE" },
  });
  await audit(archive ? "PLAN_ARCHIVED" : "PLAN_RESTORED", id, "MembershipPlan");
  revalidatePath("/admin/plans");
  return { ok: true };
}

/* ================= MEMBERSHIPS ================= */
export async function assignMembershipAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const userId = String(formData.get("userId"));
    const planId = String(formData.get("planId"));
    const startStr = String(formData.get("startDate") || new Date().toISOString().slice(0, 10));
    const recordPayment = formData.get("recordPayment") === "on";

    const plan = await db.membershipPlan.findUnique({ where: { id: planId } });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!plan || !user) return { ok: false, error: "validation.serverError" };
    if (plan.status !== "ACTIVE") return { ok: false, error: "admin.selectPlan" };

    const startDate = new Date(startStr);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const membership = await db.membership.create({
      data: {
        userId, planId, startDate, endDate,
        pricePaid: plan.price, status: "ACTIVE", createdById: admin.id,
      },
    });
    if (recordPayment) {
      await db.payment.create({
        data: {
          userId, membershipId: membership.id, amount: plan.price,
          method: (formData.get("paymentMethod") as string) || "CASH",
          status: "PAID", paidAt: startDate, recordedById: admin.id,
        },
      });
    }
    await db.notification.create({
      data: {
        userId, type: "membership",
        title: "New membership",
        body: `${plan.nameEn} — valid until ${endDate.toISOString().slice(0, 10)}`,
        link: "/client/membership",
      },
    });
    await audit("MEMBERSHIP_ASSIGNED", membership.id, "Membership", `${user.firstName} ${user.lastName}`);
    revalidatePath(`/admin/members/${userId}`);
    revalidatePath("/admin");
    return { ok: true };
  } catch {
    return { ok: false, error: "validation.serverError" };
  }
}

export async function membershipAction_(
  membershipId: string,
  op: "RENEW" | "PAUSE" | "RESUME" | "CANCEL" | "EXTEND",
  arg?: number
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  const m = await db.membership.findUnique({ where: { id: membershipId } });
  if (!m) return { ok: false, error: "validation.serverError" };

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const status = membershipStatus(m, settings?.expiringSoonDays ?? 7, 0);

  if (op === "PAUSE") {
    if (status === "PAUSED" || status === "EXPIRED") return { ok: false, error: "validation.serverError" };
    await db.membership.update({ where: { id: m.id }, data: { status: "PAUSED", pausedAt: new Date() } });
  } else if (op === "RESUME") {
    if (m.status !== "PAUSED") return { ok: false, error: "validation.serverError" };
    // extend end date by paused duration
    const pausedDays = m.pausedAt
      ? Math.ceil((Date.now() - new Date(m.pausedAt).getTime()) / 86400000)
      : 0;
    const endDate = new Date(m.endDate);
    endDate.setDate(endDate.getDate() + pausedDays);
    await db.membership.update({
      where: { id: m.id },
      data: { status: "ACTIVE", pausedAt: null, pausedDays: m.pausedDays + pausedDays },
    });
  } else if (op === "CANCEL") {
    await db.membership.update({ where: { id: m.id }, data: { status: "CANCELLED" } });
  } else if (op === "EXTEND") {
    const days = Math.max(1, arg ?? 7);
    const endDate = new Date(m.endDate);
    endDate.setDate(endDate.getDate() + days);
    await db.membership.update({ where: { id: m.id }, data: { endDate, status: "ACTIVE" } });
  } else if (op === "RENEW") {
    const plan = await db.membershipPlan.findUnique({ where: { id: m.planId } });
    if (!plan) return { ok: false, error: "validation.serverError" };
    const base = new Date(m.endDate) > new Date() ? new Date(m.endDate) : new Date();
    const endDate = new Date(base);
    endDate.setDate(endDate.getDate() + plan.durationDays);
    await db.membership.update({ where: { id: m.id }, data: { status: "EXPIRED" } });
    const newM = await db.membership.create({
      data: {
        userId: m.userId, planId: m.planId, startDate: base, endDate,
        pricePaid: plan.price, status: "ACTIVE", createdById: admin.id,
      },
    });
    await audit("MEMBERSHIP_RENEWED", newM.id, "Membership", `from ${m.id}`);
  }

  await audit(`MEMBERSHIP_${op}`, m.id, "Membership");
  revalidatePath(`/admin/members/${m.userId}`);
  revalidatePath("/admin");
  revalidatePath("/admin/members");
  return { ok: true };
}

/* ================= PAYMENTS ================= */
export async function recordPaymentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const userId = String(formData.get("userId"));
    const amount = z.number().min(1).parse(Number(formData.get("amount")));
    const method = z.enum(["CASH", "CCP", "BARIDIMOB", "BANK", "ONLINE", "OTHER"]).parse(
      formData.get("method")
    );
    const membershipId = (formData.get("membershipId") as string) || "";
    const reference = (formData.get("reference") as string) || "";
    const notes = (formData.get("notes") as string) || "";
    const paidAtStr = (formData.get("paidAt") as string) || "";

    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) return { ok: false, error: "admin.selectMember" };

    const payment = await db.payment.create({
      data: {
        userId,
        membershipId: membershipId || null,
        amount,
        method,
        status: "PAID",
        reference: reference || null,
        notes: notes || null,
        paidAt: paidAtStr ? new Date(paidAtStr) : new Date(),
        recordedById: admin.id,
      },
    });
    await audit("PAYMENT_RECORDED", payment.id, "Payment", `${amount} ${method}`);
    revalidatePath("/admin/payments");
    revalidatePath("/admin");
    revalidatePath(`/admin/members/${userId}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: "validation.invalidAmount" };
    return { ok: false, error: "validation.serverError" };
  }
}

export async function deletePaymentAction(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  await db.payment.delete({ where: { id } });
  await audit("PAYMENT_DELETED", id, "Payment");
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
  return { ok: true };
}
