"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { signSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { z } from "zod";
import type { ActionResult } from "@/server-actions/auth";

/* ================= ADMIN ACCOUNT =================
   The gym owner manages their own profile from Settings:
   photo, name, sign-in email and password. Password change
   always requires the current password; email change keeps
   the session alive by re-issuing the JWT with the new email. */

const accountSchema = z.object({
  firstName: z.string().trim().max(50).optional().or(z.literal("")),
  lastName: z.string().trim().max(50).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email(),
  avatar: z
    .string()
    .refine(
      (v) =>
        v === "" ||
        v === "__remove__" ||
        (v.startsWith("data:image/") && v.length <= 400_000),
      { message: "validation.invalidAvatar" }
    )
    .optional()
    .or(z.literal("")),
  currentPassword: z.string().optional().or(z.literal("")),
  newPassword: z.string().optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
});

export async function updateAdminAccountAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "validation.unauthorized" };

  try {
    const data = accountSchema.parse({
      firstName: (formData.get("firstName") as string) || "",
      lastName: (formData.get("lastName") as string) || "",
      email: String(formData.get("email") ?? ""),
      avatar: String(formData.get("avatar") ?? ""),
      currentPassword: (formData.get("currentPassword") as string) || "",
      newPassword: (formData.get("newPassword") as string) || "",
      confirmPassword: (formData.get("confirmPassword") as string) || "",
    });

    /* ---- password rules (only when a new one is supplied) ---- */
    let passwordHash: string | undefined;
    if (data.newPassword) {
      if (data.newPassword.length < 8) return { ok: false, error: "validation.passwordShort" };
      if (data.newPassword !== data.confirmPassword)
        return { ok: false, error: "validation.passwordsDontMatch" };
      const current = await db.user.findUnique({
        where: { id: admin.id },
        select: { passwordHash: true },
      });
      if (!current?.passwordHash || !verifyPassword(data.currentPassword || "", current.passwordHash)) {
        return { ok: false, error: "validation.wrongPassword" };
      }
      passwordHash = hashPassword(data.newPassword);
    } else if (data.currentPassword) {
      // current password typed but no new one — tell the admin why nothing happened
      return { ok: false, error: "validation.passwordShort" };
    }

    /* ---- email uniqueness (excluding self) ---- */
    const emailChanged = data.email !== admin.email;
    if (emailChanged) {
      const clash = await db.user.findUnique({ where: { email: data.email }, select: { id: true } });
      if (clash && clash.id !== admin.id) return { ok: false, error: "validation.emailExists" };
    }

    /* ---- avatar: empty string means "keep current", "null" marker means remove ---- */
    const avatarRaw = formData.get("avatar");
    let avatar: string | null | undefined;
    if (avatarRaw === "__remove__") avatar = null;
    else if (data.avatar) avatar = data.avatar;

    await db.user.update({
      where: { id: admin.id },
      data: {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        email: data.email,
        ...(avatar !== undefined ? { avatar } : {}),
        ...(passwordHash ? { passwordHash } : {}),
      },
    });

    /* keep the live session valid when the email inside the JWT changes */
    if (emailChanged) {
      const token = await signSession({ uid: admin.id, role: "ADMIN", email: data.email });
      const store = await cookies();
      store.set(SESSION_COOKIE, token, sessionCookieOptions);
    }

    await db.auditLog.create({
      data: {
        adminId: admin.id,
        action: "ACCOUNT_UPDATE",
        target: data.email,
        entity: "User",
        metadata: JSON.stringify({
          emailChanged,
          passwordChanged: !!passwordHash,
          avatarChanged: avatar !== undefined,
        }),
      },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0].message };
    console.error("updateAdminAccount error", e);
    return { ok: false, error: "validation.serverError" };
  }
}
