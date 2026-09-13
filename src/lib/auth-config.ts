import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto-secrets";

/**
 * Central reader for the auth configuration (SMTP + Facebook app).
 * Env vars override the admin-UI values so ops can force config
 * without touching the database.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  fromName: string;
}

export interface FacebookConfig {
  appId: string;
  appSecret: string;
}

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
}

export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  if (process.env.SMTP_HOST && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: (process.env.SMTP_SECURE ?? "false") === "true",
      user: process.env.SMTP_USER ?? "",
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "no-reply@mokhtargym.dz",
      fromName: "MOKHTAR GYM",
    };
  }
  const gym = await db.gymSettings.findUnique({ where: { id: "main" } });
  if (!gym?.smtpHost) return null;
  const pass = decryptSecret(gym.smtpPass);
  if (!pass) return null;
  return {
    host: gym.smtpHost,
    port: gym.smtpPort ?? 587,
    secure: gym.smtpSecure,
    user: gym.smtpUser ?? "",
    pass,
    from: gym.smtpFrom || gym.smtpUser || "no-reply@mokhtargym.dz",
    fromName: gym.gymName || "MOKHTAR GYM",
  };
}

export async function getFacebookConfig(): Promise<FacebookConfig | null> {
  if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
    return { appId: process.env.FACEBOOK_APP_ID, appSecret: process.env.FACEBOOK_APP_SECRET };
  }
  const gym = await db.gymSettings.findUnique({ where: { id: "main" } });
  if (!gym?.fbAppId || !gym.fbAppSecret) return null;
  const appSecret = decryptSecret(gym.fbAppSecret);
  if (!appSecret) return null;
  return { appId: gym.fbAppId, appSecret };
}

export async function getGoogleConfig(): Promise<GoogleConfig | null> {
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    return {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
  }
  const gym = await db.gymSettings.findUnique({ where: { id: "main" } });
  if (!gym?.googleClientId || !gym.googleClientSecret) return null;
  const clientSecret = decryptSecret(gym.googleClientSecret);
  if (!clientSecret) return null;
  return { clientId: gym.googleClientId, clientSecret };
}

/** Public base URL of this deployment (behind the preview proxy). */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host =
    h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
