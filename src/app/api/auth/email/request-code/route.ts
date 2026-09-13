import { NextRequest, NextResponse } from "next/server";
import { randomInt } from "crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { getSmtpConfig, getBaseUrl } from "@/lib/auth-config";
import {
  sendMail,
  verificationCodeEmail,
  verificationCodeSubject,
} from "@/lib/mailer";

export const runtime = "nodejs";

/**
 * POST /api/auth/email/request-code
 * Body: { email }
 *
 * Emits a one-time 6-digit login code to the member's inbox.
 * Hardening: 60s per-email cooldown, hourly caps per email and per IP,
 * scrypt-hashed codes, identical response shape for known and unknown
 * addresses (no account enumeration). When SMTP is not configured the
 * endpoint falls back to "dev mode" and returns the code so the owner
 * can validate the flow before wiring a real mailbox.
 */

const emailSchema = z.string().trim().toLowerCase().email().max(190);

const CODE_TTL_MS = 10 * 60_000; // 10 minutes
const RESEND_COOLDOWN_MS = 60_000; // 60s between two codes per email
const MAX_CODES_PER_EMAIL_PER_HOUR = 6;
const MAX_REQUESTS_PER_IP_PER_HOUR = 12;

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
  let email: string;
  try {
    const body = await req.json().catch(() => ({}));
    email = emailSchema.parse(body.email);
  } catch {
    return json({ ok: false, error: "validation.invalidEmail" }, 400);
  }

  // --- brute force guards -------------------------------------------
  if (!rateLimit(`code:ip:${ip(req)}`, MAX_REQUESTS_PER_IP_PER_HOUR, 3_600_000)) {
    return json({ ok: false, error: "auth.rateLimited" }, 429);
  }
  if (!rateLimit(`code:email:${email}`, MAX_CODES_PER_EMAIL_PER_HOUR, 3_600_000)) {
    return json({ ok: false, error: "auth.tooManyCodes" }, 429);
  }

  const now = Date.now();

  // --- per-email 60s cooldown ---------------------------------------
  const latest = await db.emailVerificationCode.findFirst({
    where: { email, createdAt: { gt: new Date(now - RESEND_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (latest) {
    const waitSec = Math.ceil(
      (latest.createdAt.getTime() + RESEND_COOLDOWN_MS - now) / 1000
    );
    return json(
      { ok: false, error: "auth.cooldown", cooldown: Math.max(waitSec, 1) },
      429
    );
  }

  // --- issue the code -------------------------------------------------
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  await db.$transaction(async (tx) => {
    // keep only the freshest unconsumed code per address
    await tx.emailVerificationCode.deleteMany({
      where: { email, consumedAt: null },
    });
    await tx.emailVerificationCode.create({
      data: {
        email,
        codeHash: hashPassword(code),
        expiresAt: new Date(now + CODE_TTL_MS),
        requestIp: ip(req),
      },
    });
  });

  // --- deliver --------------------------------------------------------
  const smtp = await getSmtpConfig();
  if (smtp) {
    const sent = await sendMail(
      smtp,
      email,
      verificationCodeSubject(),
      verificationCodeEmail(code)
    );
    if (!sent.ok) {
      return json({ ok: false, error: "auth.emailSendFailed" }, 502);
    }
    console.info(`[auth] login code emailed to ${email} (${ip(req)})`);
    return json({ ok: true, sent: true, ttl: CODE_TTL_MS });
  }

  // --- dev mode: SMTP not configured ----------------------------------
  console.warn(
    `[auth] DEV MODE — SMTP not configured. Login code for ${email}: ${code}`
  );
  return json({
    ok: true,
    sent: false,
    dev: true,
    devCode: code,
    ttl: CODE_TTL_MS,
    base: await getBaseUrl(),
  });
}
