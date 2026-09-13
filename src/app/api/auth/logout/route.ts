import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

/**
 * GET /api/auth/logout — hard sign-out.
 * Clears the httpOnly session cookie and lands on the member sign-in
 * page. The layouts redirect here when the session cookie is valid but
 * the user no longer exists (e.g. deleted by staff mid-session) —
 * without this, /client <-> /login would loop forever because the
 * middleware keeps bouncing a "logged-in" user away from auth pages.
 */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/login", req.url));
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions, maxAge: 0 });
  return res;
}
