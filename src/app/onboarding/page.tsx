"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { completeOnboardingAction } from "@/server-actions/auth";
import { useMgAction } from "@/lib/use-mg-action";
import { Field, SubmitButton } from "@/components/brand/field";
import { AvatarPicker } from "@/components/brand/avatar-picker";
import { GymEmblem } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/brand/language-switcher";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

const STEPS = 2;

export default function OnboardingPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const [state, formAction, pending] = useMgAction(completeOnboardingAction, {
    onSuccess: () => setDone(true),
  });
  const [step, setStep] = useState(0);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    gender: "", // "" forces an explicit male/female choice (undisclosed removed)
    phone: "",
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const stepValid =
    step === 0
      ? form.firstName.trim().length >= 2 &&
        form.lastName.trim().length >= 2 &&
        (form.gender === "male" || form.gender === "female")
      : true;

  // Enter must advance the wizard, never fire an early implicit submit —
  // the visible step fields carry no `name` (hidden mirrors do), so an
  // accidental submit would otherwise skip the remaining steps.
  const onFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter" && step < STEPS - 1) {
      e.preventDefault();
      if (stepValid) setStep((s) => s + 1);
    }
  };

  if (done) {
    return (
      <main className="brand-bg relative flex min-h-screen flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.21, 0.6, 0.35, 1] }}
          className="flex flex-col items-center text-center"
        >
          <div className="relative">
            <GymEmblem className="h-20 w-20" />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 18 }}
              className="absolute -right-2 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary"
            >
              <Check className="h-4 w-4 text-black" strokeWidth={3.5} />
            </motion.div>
          </div>
          <h1 className="font-display mt-7 text-2xl font-black tracking-wide gold-text">
            {t("auth.welcomeName", { name: form.firstName || "" }).toUpperCase()}
          </h1>
          <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-neutral-500">
            {t("auth.journeyStarts")}
          </p>
          <div className="mt-5 flex items-center gap-1.5 text-primary/70">
            <Sparkles className="h-4 w-4" />
            <Sparkles className="h-3 w-3" />
            <Sparkles className="h-4 w-4" />
          </div>
          <button
            onClick={() => router.push("/client")}
            className="animate-pulse-gold mt-9 h-12 rounded-xl bg-primary px-12 text-[13px] font-extrabold tracking-wider text-black transition-all hover:bg-[#ffd700] active:scale-[0.98]"
          >
            {t("auth.getStarted")}
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="brand-bg relative min-h-screen px-5 pb-10 pt-6">
      <div className="mx-auto flex max-w-md flex-col">
        {/* header */}
        <div className="flex items-center justify-between">
          <GymEmblem className="h-9 w-9" />
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        {/* progress */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-[0.18em] text-primary">
              {t("auth.step", { n: step + 1, total: STEPS })}
            </span>
            <span className="text-[11px] font-medium text-neutral-600">
              {step === 0 ? t("auth.personalInfo") : t("auth.contactInfo")}
            </span>
          </div>
          <div className="mt-2.5 flex gap-1.5">
            {Array.from({ length: STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors duration-500",
                  i <= step ? "bg-primary" : "bg-neutral-800"
                )}
              />
            ))}
          </div>
        </div>

        <form
          action={formAction}
          onKeyDown={onFormKeyDown}
          className="mt-8 flex flex-1 flex-col"
        >
          {/* single source of truth for submission: hidden mirrors of the
              wizard state. Step fields are unmounted as the user advances
              (AnimatePresence), so only these survive into FormData — this
              is what makes the final submit carry the whole profile. */}
          <input type="hidden" name="firstName" value={form.firstName} />
          <input type="hidden" name="lastName" value={form.lastName} />
          <input type="hidden" name="dob" value={form.dob} />
          <input type="hidden" name="gender" value={form.gender} />
          <input type="hidden" name="phone" value={form.phone} />
          <input type="hidden" name="avatar" value={avatar ?? ""} />
          <input type="hidden" name="language" value={locale} />

          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div
                key="s0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-5"
              >
                <h2 className="font-display text-[22px] font-black text-neutral-50">
                  {t("auth.completeProfile")}
                </h2>
                <Field
                  id="ob-first"
                  autoComplete="given-name"
                  label={t("common.firstName")}
                  placeholder={t("common.firstName")}
                  value={form.firstName}
                  onChange={set("firstName")}
                />
                <Field
                  id="ob-last"
                  autoComplete="family-name"
                  label={t("common.lastName")}
                  placeholder={t("common.lastName")}
                  value={form.lastName}
                  onChange={set("lastName")}
                />
                <Field
                  id="ob-dob"
                  type="date"
                  label={t("common.dateOfBirth")}
                  value={form.dob}
                  onChange={set("dob")}
                  max={new Date().toISOString().slice(0, 10)}
                  min="1926-01-01"
                />
                <div className="space-y-2">
                  <Label className="text-[13px] font-semibold text-neutral-300">
                    {t("common.gender")}
                    <span className="ms-1 text-primary">*</span>
                  </Label>
                  <RadioGroup
                    value={form.gender}
                    onValueChange={(v) => setForm((f) => ({ ...f, gender: v }))}
                    className="grid grid-cols-2 gap-2"
                  >
                    {[
                      { v: "male", label: t("common.male") },
                      { v: "female", label: t("common.female") },
                    ].map((g) => (
                      <Label
                        key={g.v}
                        htmlFor={`g-${g.v}`}
                        className={cn(
                          "flex cursor-pointer items-center justify-center rounded-lg border py-2.5 text-[13px] font-semibold transition-all",
                          form.gender === g.v
                            ? "border-primary/60 bg-primary/10 text-primary"
                            : "border-neutral-800 bg-[#111] text-neutral-400 hover:border-neutral-600"
                        )}
                      >
                        <RadioGroupItem
                          id={`g-${g.v}`}
                          value={g.v}
                          className="sr-only"
                        />
                        {g.label}
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="s1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="flex flex-1 flex-col space-y-6"
              >
                <h2 className="font-display text-[22px] font-black text-neutral-50">
                  {t("auth.contactInfo")}
                </h2>
                <Field
                  id="ob-phone"
                  type="tel"
                  autoComplete="tel"
                  label={t("common.phone")}
                  placeholder="+213 6xx xx xx xx"
                  dir="ltr"
                  value={form.phone}
                  onChange={set("phone")}
                  hint={`+213 (${t("common.optional")})`}
                />
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <AvatarPicker value={avatar} onChange={setAvatar} />
                  <p className="text-xs text-neutral-600">
                    {t("auth.photoOptional")}
                  </p>
                </div>
                <div className="flex-1" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* server-side error — outside AnimatePresence so it shows on any step */}
          {state && !state.ok && (
            <p className="mt-6 text-center text-xs font-medium text-danger">
              {t(state.error as never)}
            </p>
          )}

          {/* nav buttons */}
          <div className="mt-8 flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="h-11 rounded-lg border border-neutral-800 px-5 text-[13px] font-bold text-neutral-400 transition-colors hover:border-neutral-600"
              >
                {t("common.back")}
              </button>
            )}
            {step < STEPS - 1 ? (
              <button
                type="button"
                disabled={!stepValid}
                onClick={() => setStep((s) => s + 1)}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-[13px] font-extrabold tracking-wider text-black transition-all hover:bg-[#ffd700] active:scale-[0.985] disabled:opacity-40"
              >
                {t("common.continue")}
                <ArrowRight className="h-4 w-4 rtl-flip" />
              </button>
            ) : (
              <SubmitButton pending={pending} className="flex-1">
                {t("common.finish")}
              </SubmitButton>
            )}
          </div>
        </form>
      </div>
    </main>
  );
}
