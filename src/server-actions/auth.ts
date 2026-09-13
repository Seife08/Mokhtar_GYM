"use server";

import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(190);

export interface ActionResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

/* ================= UNIFIED PASSWORD LOGIN ================= */

const MAX_LOGIN_ATTEMPTS_PER_EMAIL = 10; // per 15 minutes
const MAX_LOGIN_ATTEMPTS_PER_IP = 20; // per hour

/**
 * One door for the whole gym — staff AND members sign in with their
 * email + password on the same /login page. The account's own role
 * decides the destination: ADMIN lands straight in the back office,
 * CLIENT in the member app (via onboarding on a first visit).
 * Brute force is throttled per email and per IP before any database
 * lookup, and unknown / wrong-password / deleted all share one
 * message so nothing leaks.
 */
export async function passwordLoginAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const email = emailSchema.parse(formData.get("email"));
    const password = String(formData.get("password") ?? "");

    if (!password) return { ok: false, error: "validation.required" };

    // --- throttle before touching the database -------------------------
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown";
    if (
      !rateLimit(`login:ip:${ip}`, MAX_LOGIN_ATTEMPTS_PER_IP, 3_600_000) ||
      !rateLimit(
        `login:email:${email}`,
        MAX_LOGIN_ATTEMPTS_PER_EMAIL,
        15 * 60_000
      )
    ) {
      return { ok: false, error: "auth.rateLimited" };
    }

    const user = await db.user.findUnique({ where: { email } });
    // identical error for unknown / wrong password / deleted — no leaks
    if (!user || !user.passwordHash || user.status === "DELETED") {
      return { ok: false, error: "auth.invalidCredentials" };
    }
    if (user.status === "INACTIVE") {
      return { ok: false, error: "auth.accountDisabled" };
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return { ok: false, error: "auth.invalidCredentials" };
    }

    await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await db.auditLog.create({
      data: {
        adminId: user.id,
        action: user.role === "ADMIN" ? "STAFF_LOGIN" : "MEMBER_LOGIN",
        entity: "Auth",
        target: email,
        metadata: `password login from ${ip}`,
      },
    });

    const token = await signSession({ uid: user.id, role: user.role, email: user.email });
    const store = await cookies();
    store.set(SESSION_COOKIE, token, sessionCookieOptions);

    // role decides the destination — admin email lands in the back office
    const redirect =
      user.role === "ADMIN"
        ? user.onboarding
          ? "/admin"
          : "/admin/settings?setup=1"
        : user.onboarding
          ? "/client"
          : "/onboarding";

    return {
      ok: true,
      data: { redirect } as unknown as { redirect: string },
    };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: "validation.invalidEmail" };
    console.error("password login error", e);
    return { ok: false, error: "validation.serverError" };
  }
}

/* ================= LOGOUT ================= */
export async function logoutAction(): Promise<ActionResult> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return { ok: true };
}

/* ================= ONBOARDING (complete profile) ================= */
const onboardSchema = z.object({
  firstName: z.string().trim().min(2, "validation.required").max(50),
  lastName: z.string().trim().min(2, "validation.required").max(50),
  dob: z.string().optional(),
  gender: z.enum(["male", "female", "undisclosed"]).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{8,16}$/, "validation.invalidPhone")
    .optional()
    .or(z.literal("")),
  avatar: z.string().optional(),
  language: z.enum(["ar", "fr", "en"]).optional(),
});

export async function completeOnboardingAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const me = await getCurrentUser();
    if (!me || me.role !== "CLIENT") return { ok: false, error: "validation.unauthorized" };

    const data = onboardSchema.parse({
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      dob: formData.get("dob") || undefined,
      gender: formData.get("gender") || undefined,
      phone: formData.get("phone") || "",
      avatar: formData.get("avatar") || undefined,
      language: formData.get("language") || undefined,
    });

    // gender is an explicit choice (undisclosed option removed)
    if (data.gender !== "male" && data.gender !== "female") {
      return { ok: false, error: "validation.genderRequired" };
    }

    const dob = data.dob ? new Date(data.dob) : null;
    if (dob) {
      const age = (Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age < 14 || age > 100) return { ok: false, error: "validation.invalidDate" };
    }

    await db.user.update({
      where: { id: me.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        dob,
        gender: data.gender,
        phone: data.phone || null,
        avatar: data.avatar?.slice(0, 400000) || null,
        language: data.language ?? me.language,
        onboarding: true,
      },
    });

    return { ok: true, data: { redirect: "/client" } as unknown as { redirect: string } };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    console.error(e);
    return { ok: false, error: "validation.serverError" };
  }
}
