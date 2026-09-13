import "server-only";
import nodemailer from "nodemailer";
import type { SmtpConfig } from "@/lib/auth-config";

/**
 * MOKHTAR GYM outgoing mail.
 * The template is hand-built from inline-styled tables (the only
 * reliable way across Gmail/Outlook/Apple Mail) and renders
 * bilingually: Arabic (RTL) first, French beneath.
 *
 * Delivery paths (first match wins):
 *   1. BREVO_API_KEY set  → Brevo HTTP API over 443 (serverless-safe:
 *      Vercel/Netlify block outbound SMTP ports; the sender identity
 *      still comes from the admin SMTP settings)
 *   2. otherwise           → classic SMTP from the admin settings
 *      (local server / VPS — requires TLS-capable relay e.g. Brevo 587)
 */

export interface SendResult {
  ok: boolean;
  error?: string;
}

function transportFor(cfg: SmtpConfig) {
  // TLS strategy is derived from the port so the transport can never end up
  // in the broken state "implicit TLS on a STARTTLS port" (nodemailer sends
  // a TLS ClientHello to a plaintext SMTP banner → handshake failure):
  //   465  → implicit TLS from the first byte (secure: true)
  //   else → plaintext connect + mandatory STARTTLS upgrade (587, 25…)
  const useImplicitTls = cfg.port === 465;
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: useImplicitTls,
    requireTLS: !useImplicitTls, // fail loudly instead of leaking credentials plaintext
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 12_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

export async function sendMail(
  cfg: SmtpConfig,
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  const apiKey = process.env.BREVO_API_KEY;
  if (apiKey) {
    return sendViaBrevoApi(apiKey, cfg, to, subject, html);
  }
  try {
    const transport = transportFor(cfg);
    await transport.sendMail({
      from: `"${cfg.fromName}" <${cfg.from}>`,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown SMTP error";
    console.error("[mailer] send failed:", msg);
    return { ok: false, error: msg };
  }
}

/* ================= Brevo HTTP API (serverless) ================= */

async function sendViaBrevoApi(
  apiKey: string,
  cfg: SmtpConfig,
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: cfg.fromName, email: cfg.from },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => "");
    const msg = `Brevo API ${res.status}: ${text.slice(0, 300)}`;
    console.error("[mailer] brevo api failed:", msg);
    return { ok: false, error: msg };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown Brevo API error";
    console.error("[mailer] brevo api error:", msg);
    return { ok: false, error: msg };
  }
}

/* ================= verification code email ================= */

const AR = {
  greeting: "مرحباً بك في",
  intro: "استخدم رمز التأكيد أدناه لتسجيل الدخول إلى حسابك في صالة MOKHTAR GYM.",
  codeLabel: "رمز التأكيد",
  expiry: "صالح لمدة 10 دقائق فقط، وللاستخدام مرة واحدة.",
  ignore: "إذا لم تطلب هذا الرمز بنفسك، تجاهل هذه الرسالة — لن يُستخدم لإنشاء أي حساب.",
  footer: "قوة. انضباط. نتائج.",
  auto: "هذه رسالة آلية، لا تردّ عليها.",
};

const FR = {
  greeting: "Bienvenue chez",
  intro: "Utilisez le code ci-dessous pour accéder à votre espace membre MOKHTAR GYM.",
  codeLabel: "Code de vérification",
  expiry: "Valable 10 minutes, à usage unique.",
  ignore: "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.",
  footer: "FORCE. DISCIPLINE. RÉSULTATS.",
  auto: "Message automatique — merci de ne pas y répondre.",
};

export function verificationCodeEmail(code: string): string {
  const digits = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 5px;"><div style="width:44px;height:54px;line-height:54px;text-align:center;font-size:26px;font-weight:800;color:#0a0a0a;background:#F5C400;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">${d}</div></td>`
    )
    .join("");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#080808;">
<div style="display:none;font-size:1px;color:#080808;">MOKHTAR GYM — رمز تسجيل الدخول</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:28px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111111;border:1px solid #262626;border-radius:14px;overflow:hidden;">

  <!-- gold header -->
  <tr><td style="background:#0d0d0d;border-bottom:1px solid #262626;padding:26px 24px;text-align:center;">
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:900;letter-spacing:3px;color:#F5C400;">MOKHTAR GYM</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:4px;color:#8a8a8a;padding-top:6px;">FITNESS CLUB</div>
  </td></tr>

  <!-- Arabic (RTL) -->
  <tr><td dir="rtl" style="padding:28px 26px 8px;text-align:right;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#f5f5f5;margin:0 0 10px;">${AR.greeting} <span style="color:#F5C400;">MOKHTAR GYM</span></p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.9;color:#bdbdbd;margin:0;">${AR.intro}</p>
  </td></tr>

  <!-- code -->
  <tr><td align="center" style="padding:20px 26px 6px;">
    <table role="presentation" cellpadding="0" cellspacing="0"><tr>${digits}</tr></table>
    <p dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a8a8a;margin:14px 0 0;">${AR.expiry}</p>
  </td></tr>

  <!-- divider -->
  <tr><td style="padding:20px 26px 0;"><div style="height:1px;background:#262626;"></div></td></tr>

  <!-- French -->
  <tr><td dir="ltr" style="padding:18px 26px 8px;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;color:#e8e8e8;margin:0 0 6px;">${FR.greeting} MOKHTAR GYM</p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#9a9a9a;margin:0 0 4px;">${FR.intro}</p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#8a8a8a;margin:6px 0 0;">${FR.codeLabel} : <strong style="color:#F5C400;letter-spacing:2px;">${code}</strong> — ${FR.expiry}</p>
  </td></tr>

  <!-- security note -->
  <tr><td style="padding:14px 26px 22px;">
    <div dir="rtl" style="background:#161616;border:1px solid #262626;border-radius:10px;padding:12px 14px;">
      <p dir="rtl" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.8;color:#8a8a8a;margin:0;">🔒 ${AR.ignore}</p>
    </div>
  </td></tr>

  <!-- footer -->
  <tr><td style="background:#0d0d0d;border-top:1px solid #262626;padding:16px 24px;text-align:center;">
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;color:#F5C400;margin:0 0 4px;">${AR.footer}</p>
    <p style="font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#5c5c5c;margin:0;">${AR.auto}</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

export function verificationCodeSubject(): string {
  return "MOKHTAR GYM — رمز تسجيل الدخول | Code de connexion";
}
