/**
 * MOKHTAR GYM — rotate the AUTH_SECRET encryption key of the local DB.
 *
 * The running local server uses the code fallback secret (dev secret),
 * because AUTH_SECRET was never set in the local environment. The Vercel
 * deploy guide (already pushed to GitHub) instructs to set a strong
 * AUTH_SECRET on Vercel. For the migrated database to decrypt the stored
 * SMTP password on Vercel, the local ciphertext must be re-encrypted with
 * that same production secret BEFORE running migrate-to-turso.ts.
 *
 * What it does:
 *   1. Reads GymSettings.smtpPass (enc$iv$tag$ct, AES-256-GCM, key derived
 *      from the OLD secret via scrypt, same scheme as src/lib/crypto-secrets.ts)
 *   2. Decrypts with the old key, re-encrypts with the NEW secret
 *   3. Verifies the round-trip and updates the row
 *
 * Safety: idempotent — if the value already decrypts with the NEW secret it
 * exits without touching anything. A .bak copy of the DB is expected first.
 */
import { createCipheriv, createDecipheriv, scryptSync } from "node:crypto";
import { Database } from "bun:sqlite";

const OLD_SECRET = process.env.AUTH_SECRET || "mokhtar-gym-dev-secret-change-me-in-production-000000";
const NEW_SECRET = process.env.NEW_AUTH_SECRET;
const DB_FILE = process.env.DB_FILE || "/home/z/my-project/db/custom.db";

if (!NEW_SECRET) {
  console.error("Missing NEW_AUTH_SECRET. Example: NEW_AUTH_SECRET='888...' bun scripts/rotate-auth-secret.mjs");
  process.exit(1);
}

function keyOf(secret) {
  return scryptSync(secret, "mg-secret-kdf-salt", 32);
}

function decrypt(stored, key) {
  const [ivHex, tagHex, ctHex] = stored.slice("enc$".length).split("$");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, "hex")), decipher.final()]).toString("utf8");
}

function encrypt(plain, key) {
  const iv = require("node:crypto").randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return `enc$${iv.toString("hex")}$${cipher.getAuthTag().toString("hex")}$${ct.toString("hex")}`;
}

const db = new Database(DB_FILE);
const row = db.query('SELECT smtpPass FROM GymSettings WHERE id="main"').get();
const stored = row?.smtpPass;

if (!stored || !String(stored).startsWith("enc$")) {
  console.log("Nothing to rotate — smtpPass is empty or legacy plaintext.");
  process.exit(0);
}

// Already on the new key?
try {
  decrypt(stored, keyOf(NEW_SECRET));
  console.log("✓ Already encrypted with the NEW secret — nothing to do.");
  process.exit(0);
} catch {}

const oldKey = keyOf(OLD_SECRET);
const newKey = keyOf(NEW_SECRET);

const plain = decrypt(stored, oldKey); // throws if OLD_SECRET is wrong too
const reEncrypted = encrypt(plain, newKey);

// round-trip verification BEFORE writing
if (decrypt(reEncrypted, newKey) !== plain) throw new Error("round-trip failed");

db.run('UPDATE GymSettings SET smtpPass=? WHERE id="main"', [reEncrypted]);

// verify from disk
const check = new Database(DB_FILE, { readonly: true })
  .query('SELECT smtpPass FROM GymSettings WHERE id="main"')
  .get();
if (decrypt(check.smtpPass, newKey) !== plain) throw new Error("post-write verification failed");

console.log("✓ smtpPass re-encrypted with the NEW AUTH_SECRET (verified round-trip).");
console.log(`  password length kept: ${plain.length} chars (value not printed)`);
