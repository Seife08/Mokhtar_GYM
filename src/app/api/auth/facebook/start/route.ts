import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getFacebookConfig, getBaseUrl } from "@/lib/auth-config";
import { FB_STATE_COOKIE } from "@/app/api/auth/facebook/_shared";

export const runtime = "nodejs";

/**
 * GET /api/auth/facebook/start
 *
 * Opens the Facebook OAuth dialog. Called from a popup window:
 *   window.open('/api/auth/facebook/start', 'mg_fb', ...)
 *
 * The state token is bound to an httpOnly cookie so the callback can
 * reject forged / replayed redirects (CSRF). Popup blockers note: the
 * route only issues a 302 — the user gesture stays on the opener page.
 */

const STATE_TTL_MS = 10 * 60_000;

/** Facebook dialog host — overridable for self-hosted integration tests. */
const DIALOG_BASE =
  process.env.FB_DIALOG_BASE ?? "https://www.facebook.com";

export async function GET(req: NextRequest) {
  const fb = await getFacebookConfig();
  const base = await getBaseUrl();

  if (!fb) {
    // not configured — bounce to a branded explainer inside the popup
    const url = new URL("/api/auth/facebook/callback", base);
    url.searchParams.set("error", "unconfigured");
    return NextResponse.redirect(url);
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = `${base}/api/auth/facebook/callback`;

  const dialog = new URL(`${DIALOG_BASE}/v21.0/dialog/oauth`);
  dialog.searchParams.set("client_id", fb.appId);
  dialog.searchParams.set("redirect_uri", redirectUri);
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("response_type", "code");
  dialog.searchParams.set("scope", "public_profile,email");

  const res = NextResponse.redirect(dialog.toString());
  res.cookies.set(FB_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax", // must travel with the top->popup redirect chain
    secure: process.env.NODE_ENV === "production",
    path: "/api/auth/facebook",
    maxAge: STATE_TTL_MS / 1000,
  });
  return res;
}
