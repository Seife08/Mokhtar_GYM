"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { passwordLoginAction } from "@/server-actions/auth";
import { AuthShell, FormError } from "@/components/brand/auth-shell";
import { Field, PasswordField, SubmitButton } from "@/components/brand/field";
import { useI18n } from "@/i18n";

/**
 * The single door into MOKHTAR GYM — staff and members share the
 * same form. Email + password decides the destination by the
 * account's own role: the gym's admin inbox lands straight in the
 * back office, member inboxes in the member app. No code tab —
 * registered users always sign in with their password; new
 * inboxes sign up from /register, forgotten passwords are
 * recovered through /recover (both end with a password set).
 */
export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useActionState(passwordLoginAction, null);

  useEffect(() => {
    if (state?.ok && state.data) {
      const redirect = (state.data as { redirect?: string }).redirect;
      if (redirect) router.push(redirect);
    }
  }, [state, router]);

  return (
    <AuthShell>
      <div className="animate-fade-up">
        <h1 className="font-display text-[30px] font-black tracking-tight text-neutral-50">
          {t("auth.welcomeBack")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {t("auth.unifiedSubtitle")}
        </p>

        <form action={formAction} className="mt-7 space-y-5" noValidate>
          <FormError
            message={state && !state.ok ? t(state.error as never) : undefined}
          />

          <Field
            id="login-email"
            name="email"
            type="email"
            label={t("common.email")}
            placeholder="name@mail.com"
            autoComplete="email"
            required
            dir="ltr"
          />
          <div className="space-y-1.5">
            <PasswordField
              id="login-password"
              name="password"
              label={t("common.password")}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
            <div className="flex justify-end">
              <Link
                href="/recover"
                className="text-[12px] font-semibold text-neutral-500 underline-offset-4 transition-colors hover:text-primary hover:underline"
              >
                {t("common.forgotPassword")}
              </Link>
            </div>
          </div>

          <SubmitButton pending={pending}>{t("common.login")}</SubmitButton>
        </form>

        {/* quiet hint for members who signed up before passwords existed */}
        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-neutral-600">
          {t("auth.noPasswordHint")}
        </p>

        {/* new here? — quiet link to the sign-up page */}
        <p className="mt-6 text-center text-[12px] text-neutral-600">
          {t("auth.noAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-neutral-500 underline-offset-4 transition-colors hover:text-primary hover:underline"
          >
            {t("auth.createAccount")}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
