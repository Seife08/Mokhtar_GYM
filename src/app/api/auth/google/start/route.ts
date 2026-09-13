import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getGoogleConfig, getBaseUrl } from "@/lib/auth-config";
import { GOOGLE_STATE_COOKIE } from "@/app/api/auth/google/_shared";

export const runtime = "nodejs";

/**
 * GET /api/auth/google/start
 *
 * Opens the Google (Gmail) consent screen. Called from a popup window:
 *   window.open('/api/auth/google/start', 'mg_google_login', ...)
 *
 * The state token is bound to an httpOnly cookie so the callback can
 * reject forged / replayed redirects (CSRF). Popup blockers note: the
 * route only issues a 302 — the user gesture stays on the opener page.
 */

const STATE_TTL_MS = 10 * 60_000;

/** Accounts endpoint — overridable for self-hosted integration tests. */
const AUTH_BASE =
  process.env.GOOGLE_AUTH_BASE ?? "https://accounts.google.com";

export async function GET(req: NextRequest) {
  const google = await getGoogleConfig();
  const base = await getBaseUrl();

  if (!google) {
    // not configured — bounce to a branded explainer inside the popup
    const url = new URL("/api/auth/google/callback", base);
    url.searchParams.set("error", "unconfigured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${base}/api/auth/google/callback`;

  const dialog = new URL(`${AUTH_BASE}/o/oauth2/v2/auth`);
  dialog.searchParams.set("client_id", google.clientId);
  dialog.searchParams.set("redirect_uri", redirectUri);
  dialog.searchParams.set("response_type", "code");
  dialog.searchParams.set("scope", "openid email profile");
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(dialog.toString());
  res.cookies.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax", // must travel with the top->popup redirect chain
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/google",
    maxAge: STATE_TTL_MS / 1000,
  });
  return res;
}
