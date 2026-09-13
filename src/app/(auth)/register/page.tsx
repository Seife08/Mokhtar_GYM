"use client";

import Link from "next/link";
import { AuthShell } from "@/components/brand/auth-shell";
import { EmailCodePasswordFlow } from "@/components/auth/email-code-password-flow";
import { useI18n } from "@/i18n";

/**
 * Sign-up surface for new members — the "سجّل معنا" entry from the
 * landing page. Email code → create a password → onboarding: the
 * emailed code proves the inbox, the password makes the account a
 * normal email + password login from /login. Staff and members all
 * sign in with a password from /login — this is the only place a
 * code is ever mailed, and it always ends with a password set.
 */
export default function RegisterPage() {
  const { t } = useI18n();

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <h1 className="font-display text-[30px] font-black tracking-tight text-neutral-50">
          {t("auth.createAccountTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {t("auth.registerSubtitle")}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-600">
          {t("auth.registerCodeSubtitle")}
        </p>

        <div className="mt-8">
          <EmailCodePasswordFlow mode="register" />
        </div>

        {/* already a member? — quiet link to the sign-in page */}
        <p className="mt-10 text-center text-[12px] text-neutral-600">
          {t("auth.hasAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-neutral-500 underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {t("auth.signIn")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
