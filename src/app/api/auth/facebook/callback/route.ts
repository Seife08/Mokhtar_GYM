import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { getFacebookConfig, getBaseUrl } from "@/lib/auth-config";
import { facebookAppSecretProof } from "@/lib/crypto-secrets";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { popupResult, FB_STATE_COOKIE } from "@/app/api/auth/facebook/_shared";

export const runtime = "nodejs";

/**
 * GET /api/auth/facebook/callback
 *
 * OAuth 2.0 return leg, executed inside the popup window:
 *  1. state param must match the httpOnly cookie issued by /start
 *     (single use — deleted immediately) → CSRF & replay proof
 *  2. authorization code exchanged server-side for a user token
 *  3. token validated against /debug_token (app_id + user_id match)
 *  4. profile fetched with an appsecret_proof signature
 *  5. member account resolved via (provider id → linked email) and the
 *     httpOnly session cookie is set on this exact origin
 *  6. popup posts a same-origin message to the opener and closes
 *
 * The access token is intentionally NOT persisted — the profile data
 * needed for login is stored, nothing more.
 */

interface GraphTokenResponse {
  access_token?: string;
  token_type?: string;
  error?: { message?: string };
}

interface DebugTokenResponse {
  data?: {
    is_valid?: boolean;
    app_id?: string;
    user_id?: string;
  };
  error?: { message?: string };
}

interface GraphProfile {
  id?: string;
  name?: string;
  email?: string;
  picture?: { data?: { url?: string } };
  error?: { message?: string };
}

/** Graph API base — overridable for self-hosted integration tests. */
const GRAPH =
  process.env.FB_GRAPH_BASE ?? "https://graph.facebook.com/v21.0";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // ---------- popup error screens (no OAuth involved) -----------------
  const errParam = url.searchParams.get("error");
  if (errParam === "unconfigured") {
    return popupResult({
      ok: false,
      error: "auth.fbNotConfigured",
    });
  }
  if (errParam) {
    // user cancelled inside the Facebook dialog, or provider error
    return popupResult({ ok: false, error: "auth.fbDenied" });
  }

  if (!rateLimit("fb:ip:all", 600, 60_000)) {
    return popupResult({ ok: false, error: "auth.rateLimited" });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(FB_STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return popupResult({ ok: false, error: "auth.fbStateMismatch" });
  }

  // single use — eat the cookie right away
  const res = await handleCallback(req, code);
  res.cookies.delete(FB_STATE_COOKIE);
  return res;
}

async function handleCallback(req: NextRequest, code: string) {
  const fb = await getFacebookConfig();
  const base = await getBaseUrl();
  if (!fb) return popupResult({ ok: false, error: "auth.fbNotConfigured" });

  // ---------- 2. exchange the code -------------------------------------
  const tokenUrl = new URL(`${GRAPH}/oauth/access_token`);
  tokenUrl.searchParams.set("client_id", fb.appId);
  tokenUrl.searchParams.set("client_secret", fb.appSecret);
  tokenUrl.searchParams.set("redirect_uri", `${base}/api/auth/facebook/callback`);
  tokenUrl.searchParams.set("code", code);

  const tokenRes: GraphTokenResponse = await fetch(tokenUrl, {
    cache: "no-store",
  }).then((r) => r.json());
  const accessToken = tokenRes.access_token;
  if (!accessToken) {
    console.error("[auth/fb] code exchange failed:", tokenRes.error?.message);
    return popupResult({ ok: false, error: "auth.fbLoginFailed" });
  }

  // ---------- 3. verify the token server-side ---------------------------
  const proof = facebookAppSecretProof(accessToken, fb.appSecret);
  const debugUrl = new URL(`${GRAPH}/debug_token`);
  debugUrl.searchParams.set(
    "input_token",
    accessToken
  );
  debugUrl.searchParams.set(
    "access_token",
    `${fb.appId}|${fb.appSecret}`
  );
  const debug: DebugTokenResponse = await fetch(debugUrl, {
    cache: "no-store",
  }).then((r) => r.json());
  const d = debug.data;
  if (!d?.is_valid || d.app_id !== fb.appId) {
    console.error("[auth/fb] token rejected by debug_token");
    return popupResult({ ok: false, error: "auth.fbLoginFailed" });
  }

  // ---------- 4. load the profile ---------------------------------------
  const meUrl = new URL(`${GRAPH}/me`);
  meUrl.searchParams.set("fields", "id,name,email,picture.width(256)");
  meUrl.searchParams.set("access_token", accessToken);
  meUrl.searchParams.set("appsecret_proof", proof);
  const profile: GraphProfile = await fetch(meUrl, {
    cache: "no-store",
  }).then((r) => r.json());
  const fbUserId = profile.id ?? d.user_id;
  if (!fbUserId) {
    console.error("[auth/fb] profile without id");
    return popupResult({ ok: false, error: "auth.fbLoginFailed" });
  }

  const email = profile.email?.trim().toLowerCase() ?? null;
  const name = profile.name?.trim().slice(0, 80) ?? null;
  const avatarUrl = profile.picture?.data?.url ?? null;

  // ---------- 5. resolve the member account -----------------------------
  const linked = await db.oAuthAccount.findUnique({
    where: { provider_providerAccountId: { provider: "facebook", providerAccountId: fbUserId } },
    include: { user: true },
  });

  let user = linked?.user ?? null;

  if (!user && email) {
    user = await db.user.findUnique({ where: { email } });
  }

  if (user && user.status === "DELETED") {
    return popupResult({ ok: false, error: "auth.invalidCredentials" });
  }
  if (user && user.status === "INACTIVE") {
    return popupResult({ ok: false, error: "auth.accountDisabled" });
  }
  if (user && user.role === "ADMIN") {
    return popupResult({ ok: false, error: "auth.adminPasswordOnly" });
  }

  const isNew = !user;
  if (!user) {
    // split "First Last"; keep everything unknown in the first slot
    const parts = (name ?? "").split(/\s+/).filter(Boolean);
    const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
    user = await db.user.create({
      data: {
        email: email ?? `fb-${fbUserId.toLowerCase()}@members.mokhtargym.dz`,
        role: "CLIENT",
        status: "ACTIVE",
        qrToken: generateToken(20),
        firstName: parts[0]?.slice(0, 40) ?? "Member",
        lastName: parts.slice(1).join(" ").slice(0, 40) || null,
        language: settings?.defaultLang ?? "ar",
        emailVerifiedAt: email ? new Date() : null,
        onboarding: false,
        oauthAccounts: {
          create: {
            provider: "facebook",
            providerAccountId: fbUserId,
            email,
            name,
            avatarUrl,
          },
        },
      },
    });
  } else {
    // link this Facebook identity to the existing member account
    await db.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: "facebook",
          providerAccountId: fbUserId,
        },
      },
      update: { email, name, avatarUrl },
      create: {
        provider: "facebook",
        providerAccountId: fbUserId,
        userId: user.id,
        email,
        name,
        avatarUrl,
      },
    });
    if (email && !user.emailVerifiedAt) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      });
    }
  }

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    }),
    db.auditLog.create({
      data: {
        adminId: user.id,
        action: isNew ? "FACEBOOK_SIGNUP" : "FACEBOOK_LOGIN",
        target: user.email,
        entity: "Auth",
        metadata: `facebook id ${fbUserId}`,
      },
    }),
  ]);

  const redirect = user.onboarding ? "/client" : "/onboarding";

  // ---------- 6. session + popup handshake -------------------------------
  const token = await signSession({
    uid: user.id,
    role: "CLIENT",
    email: user.email,
  });
  const final = popupResult({ ok: true, redirect });
  const out = new NextResponse(final.body, {
    headers: final.headers,
    status: final.status,
  });
  out.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
  console.info(
    `[auth/fb] facebook login ok — user ${user.id} (${isNew ? "new" : "returning"})`
  );
  return out;
}
