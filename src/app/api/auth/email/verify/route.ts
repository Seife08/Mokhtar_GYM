import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { verifyPassword, generateToken, hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

/**
 * POST /api/auth/email/verify
 * Body: { email, code, password }
 *
 * Completes sign-up / password recovery in a single shot: matches the
 * freshest active code, burns it (single use), then finds-or-creates the
 * CLIENT account — the emailed code proves inbox ownership, so the
 * chosen password is bound to the account (first set OR reset) before
 * the httpOnly JWT session cookie is issued. Registered members then
 * always sign in from /login with email + password.
 *
 * Hardening:
 *  - scrypt + timing-safe comparison (codes and passwords never stored in clear)
 *  - weak passwords are rejected BEFORE the code is touched (never burned)
 *  - max 5 verification attempts per code, then it is invalidated
 *  - 15 verify attempts per email+IP per hour
 *  - admin accounts are refused and must use their password
 */

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "auth.wrongCode"),
  password: z.string().max(72).optional(),
});

const MAX_ATTEMPTS_PER_CODE = 5;
const MAX_VERIFY_PER_HOUR = 15;

function ip(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function json(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  let body: { email: string; code: string; password?: string };
  try {
    body = bodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return json({ ok: false, error: "auth.wrongCode" }, 400);
  }

  const { email, code } = body;
  const password = body.password ?? "";

  // --- password strength BEFORE touching the code -----------------------
  // a weak (or missing) input must never burn a valid code — the member
  // fixes the password and retries with the same code still active
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return json({ ok: false, error: "validation.passwordWeak" }, 400);
  }

  if (
    !rateLimit(
      `verify:${email}:${ip(req)}`,
      MAX_VERIFY_PER_HOUR,
      3_600_000
    )
  ) {
    return json({ ok: false, error: "auth.rateLimited" }, 429);
  }

  // --- fetch the freshest active code --------------------------------
  const record = await db.emailVerificationCode.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const fail = async (reason: string, extra?: Record<string, unknown>) => {
    if (record && reason === "auth.wrongCode") {
      const attempts = record.attempts + 1;
      await db.emailVerificationCode.update({
        where: { id: record.id },
        data: {
          attempts,
          // burn the code once exhausted — forces a fresh request
          consumedAt: attempts >= MAX_ATTEMPTS_PER_CODE ? new Date() : null,
        },
      });
      if (attempts >= MAX_ATTEMPTS_PER_CODE) {
        return json({ ok: false, error: "auth.tooManyAttempts" }, 429);
      }
      return json({ ok: false, error: reason, remaining: MAX_ATTEMPTS_PER_CODE - attempts }, 401);
    }
    return json({ ok: false, error: reason, ...(extra ?? {}) }, 401);
  };

  if (!record) return json({ ok: false, error: "auth.codeMissing" }, 400);
  if (record.expiresAt.getTime() < Date.now()) {
    return json({ ok: false, error: "auth.codeExpired" }, 401);
  }
  if (!verifyPassword(code, record.codeHash)) {
    return fail("auth.wrongCode");
  }

  // --- success: burn the code -----------------------------------------
  await db.emailVerificationCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  const passwordHash = hashPassword(password);

  // --- resolve the account ---------------------------------------------
  const existing = await db.user.findUnique({ where: { email } });

  if (existing && existing.status === "DELETED") {
    return json({ ok: false, error: "auth.invalidCredentials" }, 403);
  }
  if (existing && existing.status === "INACTIVE") {
    return json({ ok: false, error: "auth.accountDisabled" }, 403);
  }
  // staff accounts never use this flow — password only, managed in the back office
  if (existing && existing.role === "ADMIN") {
    return json({ ok: false, error: "auth.adminPasswordOnly" }, 403);
  }

  let user;
  let isNew = false;
  if (existing) {
    // a delivered code proves inbox ownership — bind the (new) password
    // to the existing account: doubles as first-set and reset/recovery
    user = await db.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        ...(existing.emailVerifiedAt ? {} : { emailVerifiedAt: new Date() }),
      },
    });
  } else {
    isNew = true;
    user = await db.user.create({
      data: {
        email,
        role: "CLIENT",
        status: "ACTIVE",
        qrToken: generateToken(20),
        emailVerifiedAt: new Date(),
        passwordHash,
        language: (await db.gymSettings.findUnique({ where: { id: "main" } }))
          ?.defaultLang ?? "ar",
      },
    });
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        adminId: user.id,
        action: isNew ? "EMAIL_SIGNUP" : "PASSWORD_SET",
        target: email,
        entity: "Auth",
        metadata: isNew
          ? "code signup + password set"
          : "password set via email code (recovery)",
      },
    }),
  ]);

  const redirect = user.onboarding ? "/client" : "/onboarding";

  // --- session ---------------------------------------------------------
  const token = await signSession({
    uid: user.id,
    role: "CLIENT",
    email: user.email,
  });
  const res = json({ ok: true, redirect, isNew });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  return res;
}
