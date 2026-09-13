import { SignJWT, jwtVerify } from "jose";

export type SessionRole = "ADMIN" | "CLIENT";

export interface SessionPayload {
  uid: string;
  role: SessionRole;
  email: string;
}

export const SESSION_COOKIE = "mg_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ||
    "mokhtar-gym-dev-secret-change-me-in-production-000000";
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("mokhtar-gym")
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "mokhtar-gym",
    });
    return {
      uid: payload.uid as string,
      role: payload.role as SessionRole,
      email: payload.email as string,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
