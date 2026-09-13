"use client";

import Link from "next/link";
import { AuthShell } from "@/components/brand/auth-shell";
import { EmailCodePasswordFlow } from "@/components/auth/email-code-password-flow";
import { useI18n } from "@/i18n";

/**
 * «Forgot password» / «never had one» — the recovery door linked
 * from /login. Same mechanism as sign-up: an emailed code proves
 * the inbox, then the member creates a NEW password and lands
 * straight in their account (new members finish onboarding,
 * existing ones in /client). Works for members who originally
 * signed up with a code, Facebook or Google and never set a
 * password. Admin accounts are refused — staff passwords are
 * managed in the back office.
 */
export default function RecoverPage() {
  const { t } = useI18n();

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <h1 className="font-display text-[30px] font-black tracking-tight text-neutral-50">
          {t("auth.recoverTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {t("auth.recoverSubtitle")}
        </p>

        <div className="mt-8">
          <EmailCodePasswordFlow mode="recover" />
        </div>

        {/* back to sign-in */}
        <p className="mt-10 text-center text-[12px] text-neutral-600">
          <Link
            href="/login"
            className="font-semibold text-neutral-500 underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
