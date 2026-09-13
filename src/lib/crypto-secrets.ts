import "server-only";
import { createCipheriv, createDecipheriv, createHmac, randomBytes, scryptSync } from "crypto";

/**
 * At-rest encryption for operator secrets (SMTP password, Facebook app
 * secret) stored in the SQLite settings row.
 *
 * Format: enc$<iv-hex>$<tag-hex>$<ct-hex>  — AES-256-GCM.
 * The key is derived from AUTH_SECRET with scrypt, so the ciphertext is
 * only decryptable on this deployment and never lives in plaintext.
 */

const PREFIX = "enc$";
const keyCache = new Map<string, Buffer>();

function getKey(): Buffer {
  const secret =
    process.env.AUTH_SECRET ||
    "mokhtar-gym-dev-secret-change-me-in-production-000000";
  if (keyCache.has(secret)) return keyCache.get(secret)!;
  const key = scryptSync(secret, "mg-secret-kdf-salt", 32);
  keyCache.set(secret, key);
  return key;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}$${tag.toString("hex")}$${ct.toString("hex")}`;
}

/** Returns null for values that were never encrypted (or got corrupted). */
export function decryptSecret(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext pass-through
  try {
    const [ivHex, tagHex, ctHex] = stored.slice(PREFIX.length).split("$");
    const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctHex, "hex")),
      decipher.final(),
    ]);
    return pt.toString("utf8");
  } catch {
    return null; // wrong AUTH_SECRET or tampered value — treat as unset
  }
}

/** HMAC-SHA256 app secret proof required by the Facebook Graph API. */
export function facebookAppSecretProof(accessToken: string, appSecret: string): string {
  return createHmac("sha256", appSecret).update(accessToken).digest("hex");
}
