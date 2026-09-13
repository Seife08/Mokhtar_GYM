"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2, Mail, RotateCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordField } from "@/components/brand/field";
import { useI18n } from "@/i18n";

/**
 * Sign-up / recovery flow with a password — three steps, one component.
 *
 * ① the member types their inbox → a one-time 6-digit code is mailed
 *    (MOKHTAR GYM letterhead, bilingual AR/FR).
 * ② the code is entered digit by digit; six digits auto-advance.
 * ③ the member creates a password. { email, code, password } go to the
 *    server in ONE request: the code proves inbox ownership, so the
 *    password is bound to the account (first set on sign-up, reset on
 *    recovery) and the httpOnly session cookie is issued.
 *
 * Registered members then always sign in from /login with email +
 * password — that's why every account this flow touches ends up with
 * a password. Security affordances surfaced in the UI: 60s resend
 * cooldown with live countdown, remaining-attempt hints,
 * burn-after-5 failures, and a dev-mode panel shown ONLY while the
 * gym has no SMTP configured.
 *
 * mode="register" → framed as account creation (from the landing page).
 * mode="recover"  → framed as «forgot password» (from /login).
 */

interface RequestResponse {
  ok: boolean;
  error?: string;
  sent?: boolean;
  dev?: boolean;
  devCode?: string;
  ttl?: number;
  cooldown?: number;
}

interface VerifyResponse {
  ok: boolean;
  redirect?: string;
  isNew?: boolean;
  error?: string;
  remaining?: number;
}

/** server error keys that mean "the CODE is wrong" → step back to ② */
const CODE_ERRORS = [
  "auth.wrongCode",
  "auth.codeExpired",
  "auth.codeMissing",
  "auth.tooManyAttempts",
];

const RESEND_SECONDS = 60;

export function EmailCodePasswordFlow({ mode }: { mode: "register" | "recover" }) {
  const { t } = useI18n();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "code" | "password">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  /* form-level error for steps ①/② */
  const [error, setError] = useState<string | null>(null);
  /* form-level error (i18n key) for step ③ */
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  /* live countdown for the resend cooldown */
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [countdown]);

  /* six digits in → glide to the password step (no server call yet:
     the code is only checked when the password is submitted) */
  useEffect(() => {
    if (step === "code" && code.length === 6 && !busy) {
      const id = setTimeout(() => setStep("password"), 240);
      return () => clearTimeout(id);
    }
  }, [code, step, busy]);

  const validateEmail = useCallback(
    (value: string) => {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())) {
        setEmailError(t("validation.invalidEmail"));
        return false;
      }
      setEmailError(null);
      return true;
    },
    [t]
  );

  const requestCode = useCallback(
    async (resend = false) => {
      const clean = email.trim().toLowerCase();
      if (!validateEmail(clean)) return;
      setBusy(true);
      setError(null);
      setRemainingAttempts(null);
      try {
        const res = await fetch("/api/auth/email/request-code", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: clean }),
        });
        const data: RequestResponse = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !data.ok) {
          if (data.cooldown) setCountdown(data.cooldown);
          setError(data.error ?? "validation.serverError");
          return;
        }
        setStep("code");
        setCode("");
        setCountdown(RESEND_SECONDS);
        setDevCode(data.dev ? (data.devCode ?? null) : null);
        toast.success(
          data.dev
            ? t("auth.devCodeToast")
            : t("auth.codeSent", { email: clean })
        );
      } catch {
        setError("validation.serverError");
      } finally {
        setBusy(false);
      }
    },
    [email, validateEmail, t]
  );

  /* ③ final submit — code + password travel together */
  const finish = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const clean = email.trim().toLowerCase();

      /* client-side mirror of the server rules — same message keys */
      if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
        setPasswordError("validation.passwordWeak");
        return;
      }
      if (password !== confirm) {
        setPasswordError("validation.passwordsDontMatch");
        return;
      }
      setPasswordError(null);
      setBusy(true);
      try {
        const res = await fetch("/api/auth/email/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: clean, code, password }),
        });
        const data: VerifyResponse = await res.json().catch(() => ({ ok: false }));
        if (!res.ok || !data.ok) {
          const err = data.error ?? "validation.serverError";
          if (CODE_ERRORS.includes(err)) {
            /* the code itself is the problem → back to ② to fix it */
            setCode("");
            setRemainingAttempts(data.remaining ?? null);
            setError(err);
            setStep("code");
            return;
          }
          setPasswordError(err);
          return;
        }
        toast.success(
          t(data.isNew ? "auth.welcomeAboard" : "auth.passwordReset")
        );
        router.push(data.redirect ?? "/client");
      } catch {
        setPasswordError("validation.serverError");
      } finally {
        setBusy(false);
      }
    },
    [email, code, password, confirm, router, t]
  );

  return (
    <div>
      <AnimatePresence mode="popLayout" initial={false}>
        {step === "email" ? (
          <motion.div
            key="email"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void requestCode();
              }}
              className="space-y-5"
              noValidate
            >
              {error && (
                <div
                  role="alert"
                  className="animate-fade-up rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] font-medium text-danger"
                >
                  {t(error as never, { seconds: countdown })}
                </div>
              )}

              <div className="space-y-1.5">
                <Label
                  htmlFor="ec-email"
                  className="text-[13px] font-semibold text-neutral-300"
                >
                  {t("auth.emailStepLabel")}
                </Label>
                <div className="relative">
                  <Input
                    id="ec-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="name@mail.com"
                    dir="ltr"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    onBlur={() => validateEmail(email)}
                    aria-invalid={!!emailError}
                    className="input-premium h-11 rounded-lg pe-11 text-[14px] text-neutral-100 placeholder:text-neutral-600"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-0 flex w-11 items-center justify-center text-neutral-600">
                    <Mail className="h-4 w-4" />
                  </span>
                </div>
                {emailError && (
                  <p className="text-xs font-medium text-danger">{emailError}</p>
                )}
                <p className="text-xs leading-relaxed text-neutral-600">
                  {t("auth.emailStepHint")}
                </p>
              </div>

              <Button
                type="submit"
                size="block"
                disabled={busy || countdown > 0}
                className="text-[13px] font-extrabold tracking-wider"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {countdown > 0
                  ? t("auth.cooldownButton", { seconds: countdown })
                  : t("auth.sendCode")}
              </Button>
            </form>
          </motion.div>
        ) : step === "code" ? (
          <motion.div
            key="code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <div className="space-y-5">
              {error && (
                <div
                  role="alert"
                  className="animate-fade-up rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] font-medium text-danger"
                >
                  {t(error as never, { seconds: countdown })}
                  {remainingAttempts != null && remainingAttempts > 0 && (
                    <span className="mt-0.5 block text-[11px] text-danger/80">
                      {t("auth.attemptsLeft", { count: remainingAttempts })}
                    </span>
                  )}
                </div>
              )}

              {/* dev-mode panel — only while SMTP is unconfigured */}
              {devCode && (
                <div className="animate-fade-up rounded-lg border border-[#6b4f00]/50 bg-[#1c1608] px-3.5 py-3">
                  <p className="text-[11px] font-black tracking-[0.14em] text-[#F5C400] uppercase">
                    {t("auth.devCodeTitle")}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-neutral-500">
                    {t("auth.devCodeNotice")}
                  </p>
                  <p
                    dir="ltr"
                    className="mt-2 text-center font-mono text-[24px] font-black tracking-[0.34em] text-[#F5C400]"
                  >
                    {devCode}
                  </p>
                </div>
              )}

              <p className="text-[13px] leading-relaxed text-neutral-400">
                {t("auth.codeSentHint", { email: email.trim().toLowerCase() })}
              </p>

              <div dir="ltr" className="flex justify-center py-1">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  disabled={busy}
                  autoFocus
                  aria-label={t("auth.enterCode")}
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="h-14 w-11 rounded-lg border-[#2e2e2e] bg-[#131313] text-[20px] font-black text-neutral-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] data-[active=true]:border-primary/70 data-[active=true]:ring-2 data-[active=true]:ring-primary/20"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="button"
                size="block"
                onClick={() => setStep("password")}
                disabled={busy || code.length !== 6}
                className="text-[13px] font-extrabold tracking-wider"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("common.continue")}
              </Button>

              <div className="flex items-center justify-between text-[12.5px]">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                    setError(null);
                    setDevCode(null);
                    setRemainingAttempts(null);
                  }}
                  className="inline-flex items-center gap-1.5 font-medium text-neutral-500 transition-colors hover:text-neutral-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  {t("auth.changeEmail")}
                </button>
                {countdown > 0 ? (
                  <span className="font-medium tabular-nums text-neutral-600">
                    {t("auth.resendIn", { seconds: countdown })}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void requestCode(true)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary/90 transition-colors hover:text-primary"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    {t("auth.resend")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="password"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <form action={undefined} onSubmit={(e) => void finish(e)} className="space-y-5" noValidate>
              {passwordError && (
                <div
                  role="alert"
                  className="animate-fade-up rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] font-medium text-danger"
                >
                  {t(passwordError as never, { seconds: countdown })}
                </div>
              )}

              <div className="space-y-1.5">
                <p className="font-display text-[19px] font-black tracking-tight text-neutral-100">
                  {mode === "register"
                    ? t("auth.setPasswordTitle")
                    : t("auth.newPassword")}
                </p>
                <p className="text-[12.5px] leading-relaxed text-neutral-500">
                  {t("auth.setPasswordSubtitle")}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("code");
                    setPasswordError(null);
                  }}
                  className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-500 transition-colors hover:text-neutral-300"
                >
                  <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                  {t("auth.editCode")} · <span dir="ltr" className="font-normal">{email.trim().toLowerCase()}</span>
                </button>
              </div>

              <PasswordField
                id="ec-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                autoComplete="new-password"
                label={mode === "register" ? t("common.password") : t("auth.newPassword")}
                placeholder="••••••••"
                required
                hint={t("auth.passwordHint")}
                dir="ltr"
              />
              <PasswordField
                id="ec-confirm"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                autoComplete="new-password"
                label={t("common.confirmPassword")}
                placeholder="••••••••"
                required
                dir="ltr"
              />

              <Button
                type="submit"
                size="block"
                disabled={busy}
                className="text-[13px] font-extrabold tracking-wider"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {mode === "register" ? t("auth.finishSignup") : t("auth.finishReset")}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
