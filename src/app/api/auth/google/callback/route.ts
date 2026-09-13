import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";
import { getGoogleConfig, getBaseUrl } from "@/lib/auth-config";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { popupResult, GOOGLE_STATE_COOKIE } from "@/app/api/auth/google/_shared";

export const runtime = "nodejs";

/**
 * GET /api/auth/google/callback
 *
 * OAuth 2.0 return leg, executed inside the popup window:
 *  1. state param must match the httpOnly cookie issued by /start
 *     (single use — deleted immediately) → CSRF & replay proof
 *  2. authorization code exchanged server-side for tokens (the client
 *     secret never leaves this server; the browser never sees it)
 *  3. the returned id_token is verified against Google's own
 *     tokeninfo endpoint — signature, issuer and expiry are checked by
 *     Google, and we additionally enforce aud == our client id
 *  4. member account resolved via (google id → linked email) and the
 *     httpOnly session cookie is set on this exact origin
 *  5. popup posts a same-origin message to the opener and closes
 *
 * Access and refresh tokens are intentionally NOT persisted — the
 * profile data needed for login is stored, nothing more. The member's
 * Google password is typed on accounts.google.com and never touches
 * our servers.
 */

interface TokenEndpointResponse {
  id_token?: string;
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface TokenInfoClaims {
  iss?: string;
  aud?: string;
  sub?: string;
  email?: string;
  email_verified?: boolean | string;
  name?: string;
  picture?: string;
  exp?: number | string;
  error_description?: string;
}

/** OAuth endpoints — overridable for self-hosted integration tests. */
const TOKEN_BASE =
  process.env.GOOGLE_TOKEN_BASE ?? "https://oauth2.googleapis.com";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  // ---------- popup error screens (no OAuth involved) -----------------
  const errParam = url.searchParams.get("error");
  if (errParam === "unconfigured") {
    return popupResult({ ok: false, error: "auth.googleNotConfigured" });
  }
  if (errParam) {
    // user cancelled inside the Google consent screen, or provider error
    return popupResult({ ok: false, error: "auth.googleDenied" });
  }

  if (!rateLimit("google:ip:all", 600, 60_000)) {
    return popupResult({ ok: false, error: "auth.rateLimited" });
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = req.cookies.get(GOOGLE_STATE_COOKIE)?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return popupResult({ ok: false, error: "auth.googleStateMismatch" });
  }

  // single use — eat the cookie right away
  const res = await handleCallback(req, code);
  res.cookies.delete(GOOGLE_STATE_COOKIE);
  return res;
}

async function handleCallback(req: NextRequest, code: string) {
  const google = await getGoogleConfig();
  const base = await getBaseUrl();
  if (!google) return popupResult({ ok: false, error: "auth.googleNotConfigured" });

  // ---------- 2. exchange the code (server-side, secret stays home) ----
  const tokenRes = await fetch(`${TOKEN_BASE}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: google.clientId,
      client_secret: google.clientSecret,
      redirect_uri: `${base}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });
  const token: TokenEndpointResponse = await tokenRes
    .json()
    .catch(() => ({}));
  const idToken = token.id_token;
  if (!tokenRes.ok || !idToken) {
    console.error(
      "[auth/google] code exchange failed:",
      token.error_description ?? token.error
    );
    return popupResult({ ok: false, error: "auth.googleLoginFailed" });
  }

  // ---------- 3. verify the id_token with Google -----------------------
  const infoUrl = new URL(`${TOKEN_BASE}/tokeninfo`);
  infoUrl.searchParams.set("id_token", idToken);
  const infoRes = await fetch(infoUrl, { cache: "no-store" });
  if (!infoRes.ok) {
    console.error("[auth/google] tokeninfo rejected the id_token");
    return popupResult({ ok: false, error: "auth.googleLoginFailed" });
  }
  const info: TokenInfoClaims = await infoRes.json().catch(() => ({}));

  // tokeninfo checks signature/issuer/expiry; aud binding is on us
  const googleUserId = info.sub;
  if (!googleUserId || info.aud !== google.clientId) {
    console.error("[auth/google] id_token aud mismatch or missing sub");
    return popupResult({ ok: false, error: "auth.googleLoginFailed" });
  }

  // only trust a mailbox Google itself has verified
  const emailVerified =
    info.email_verified === true || info.email_verified === "true";
  const email =
    info.email && emailVerified ? info.email.trim().toLowerCase() : null;
  const name = info.name?.trim().slice(0, 80) ?? null;
  const avatarUrl = info.picture ?? null;

  // ---------- 4. resolve the member account ----------------------------
  const linked = await db.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider: "google", providerAccountId: googleUserId },
    },
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
        email: email ?? `google-${googleUserId.toLowerCase()}@members.mokhtargym.dz`,
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
            provider: "google",
            providerAccountId: googleUserId,
            email,
            name,
            avatarUrl,
          },
        },
      },
    });
  } else {
    // link this Google identity to the existing member account
    await db.oAuthAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: googleUserId,
        },
      },
      update: { email, name, avatarUrl },
      create: {
        provider: "google",
        providerAccountId: googleUserId,
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
        action: isNew ? "GOOGLE_SIGNUP" : "GOOGLE_LOGIN",
        target: user.email,
        entity: "Auth",
        metadata: `google id ${googleUserId}`,
      },
    }),
  ]);

  const redirect = user.onboarding ? "/client" : "/onboarding";

  // ---------- 5. session + popup handshake ------------------------------
  const sessionToken = await signSession({
    uid: user.id,
    role: "CLIENT",
    email: user.email,
  });
  const final = popupResult({ ok: true, redirect });
  const out = new NextResponse(final.body, {
    headers: final.headers,
    status: final.status,
  });
  out.cookies.set(SESSION_COOKIE, sessionToken, sessionCookieOptions);
  console.info(
    `[auth/google] google login ok — user ${user.id} (${isNew ? "new" : "returning"})`
  );
  return out;
}
