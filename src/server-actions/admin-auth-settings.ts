"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto-secrets";
import { getSmtpConfig } from "@/lib/auth-config";
import { sendMail, verificationCodeEmail, verificationCodeSubject } from "@/lib/mailer";
import type { ActionResult } from "@/server-actions/auth";

/* ================= AUTH SETTINGS (SMTP — email codes) ================= */

const smtpSchema = z.object({
  smtpHost: z
    .string()
    .trim()
    .max(190)
    .optional()
    .transform((v) => v || null),
  smtpPort: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .optional()
    .transform((v) => (v == null || Number.isNaN(v) ? null : v)),
  smtpSecure: z.boolean(),
  smtpUser: z
    .string()
    .trim()
    .max(190)
    .optional()
    .transform((v) => v || null),
  smtpPass: z
    .string()
    .max(300)
    .optional()
    .transform((v) => v || null),
  smtpFrom: z
    .string()
    .trim()
    .email("validation.invalidEmail")
    .max(190)
    .optional()
    .or(z.literal(""))
    .transform((v) => v || null),
});

/** Keep the existing ciphertext when the admin leaves the secret blank. */
function keepOrReplace(newValue: string | null, current: string | null, encrypt: (s: string) => string): string | null {
  if (newValue) return encrypt(newValue);
  return current ?? null; // blank = untouched
}

/** Persists the SMTP block from the settings form and writes the audit
 *  trail entry. Shared by the save button AND the test-email button —
 *  the test button submits the same form, so the credentials the admin
 *  just typed are committed before any send attempt. Without this, a
 *  freshly filled form fails with "SMTP not configured". */
async function persistSmtpSettings(
  adminId: string,
  formData: FormData
): Promise<void> {
  const data = smtpSchema.parse({
    smtpHost: String(formData.get("smtpHost") ?? "").trim(),
    smtpPort: formData.get("smtpPort") ? Number(formData.get("smtpPort")) : undefined,
    smtpSecure: String(formData.get("smtpSecure")) === "true",
    smtpUser: String(formData.get("smtpUser") ?? "").trim(),
    smtpPass: String(formData.get("smtpPass") ?? ""),
    smtpFrom: String(formData.get("smtpFrom") ?? "").trim(),
  });

  const current = await db.gymSettings.findUnique({ where: { id: "main" } });

  // Normalize the TLS mode against the port so the stored row can never hold
  // the broken combination "implicit TLS (secure=true) on a STARTTLS port".
  // 465 = implicit TLS; 587/25 = plaintext + STARTTLS upgrade.
  const storedPort = data.smtpPort ?? (data.smtpHost ? 587 : null);
  const storedSecure = storedPort === 465;

  await db.gymSettings.upsert({
    where: { id: "main" },
    update: {
      smtpHost: data.smtpHost,
      smtpPort: storedPort,
      smtpSecure: storedSecure,
      smtpUser: data.smtpUser,
      smtpPass: keepOrReplace(data.smtpPass, current?.smtpPass ?? null, encryptSecret),
      smtpFrom: data.smtpFrom,
    },
    create: {
      id: "main",
      smtpHost: data.smtpHost,
      smtpPort: storedPort,
      smtpSecure: storedSecure,
      smtpUser: data.smtpUser,
      smtpPass: data.smtpPass ? encryptSecret(data.smtpPass) : null,
      smtpFrom: data.smtpFrom,
    },
  });

  await db.auditLog.create({
    data: {
      adminId,
      action: "AUTH_SETTINGS_UPDATED",
      entity: "GymSettings",
      target: "main",
      metadata: `smtp:${data.smtpHost ? "on" : "off"}`,
    },
  });
}

export async function saveAuthSettingsAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    await persistSmtpSettings(admin.id, formData);
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    console.error("saveAuthSettings error", e);
    return { ok: false, error: "validation.serverError" };
  }
}

/* ================= TEST EMAIL ================= */

const testEmailSchema = z.string().trim().toLowerCase().email("validation.invalidEmail");

/** Fires a sample verification-code email so the owner can confirm the
 *  SMTP wiring end to end before announcing the feature to members. */
export async function sendTestEmailAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };
  try {
    const to = testEmailSchema.parse(String(formData.get("testTo") ?? ""));

    // Auto-save whatever the admin typed BEFORE sending — the test button
    // submits the whole settings form, so persist it in the same click.
    await persistSmtpSettings(admin.id, formData);

    const smtp = await getSmtpConfig();
    if (!smtp) return { ok: false, error: "auth.smtpNotConfigured" };

    const demoCode = String(Math.floor(100000 + Math.random() * 900000));
    const sent = await sendMail(
      smtp,
      to,
      verificationCodeSubject(),
      verificationCodeEmail(demoCode)
    );
    if (!sent.ok) {
      console.error("test email failed:", sent.error);
      // Surface the provider's real error to the admin (SMTP logins,
      // sender rejections, TLS mismatches…) — the raw string passes
      // through t() as-is for unknown keys. Members never see this.
      return { ok: false, error: sent.error ?? "auth.emailSendFailed" };
    }
    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "TEST_EMAIL_SENT",
        entity: "Mailer",
        target: to,
        metadata: smtp.host,
      },
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    return { ok: false, error: "validation.serverError" };
  }
}
