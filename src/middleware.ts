import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const ADMIN_PREFIX = "/admin";
const CLIENT_PREFIX = "/client";
const LEGACY_STAFF_LOGIN = "/admin/login";
const AUTH_PAGES = ["/login", "/register", "/recover"];
const PUBLIC_API = ["/api/health", "/api/auth/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // allow public assets & API health
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/sw.js") ||
    PUBLIC_API.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  // --- one door for everyone: the old staff-only entrance now folds
  //     into the unified /login (email + password decides the role) ---
  if (pathname === LEGACY_STAFF_LOGIN) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // --- protected areas ---
  if (pathname.startsWith(ADMIN_PREFIX) || pathname.startsWith(CLIENT_PREFIX)) {
    if (!session) {
      // both areas share the unified sign-in page
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith(ADMIN_PREFIX) && session.role !== "ADMIN") {
      // client trying to reach admin → send to client app
      return NextResponse.redirect(new URL("/client", req.url));
    }
    if (pathname.startsWith(CLIENT_PREFIX) && session.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // --- NFC gate page: full-screen check-in (outside the app shell) ---
  if (pathname === "/checkin") {
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", "/checkin");
      return NextResponse.redirect(url);
    }
    if (session.role !== "CLIENT") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // --- auth pages: redirect logged-in users away ---
  if (AUTH_PAGES.includes(pathname) && session) {
    return NextResponse.redirect(
      new URL(session.role === "ADMIN" ? "/admin" : "/client", req.url)
    );
  }

  // --- root: role-based entry ---
  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(
        new URL(session.role === "ADMIN" ? "/admin" : "/client", req.url)
      );
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
