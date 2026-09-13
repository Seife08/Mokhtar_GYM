"use client";

import { GymEmblem } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/brand/language-switcher";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Split-screen auth shell.
 * Desktop: brand panel + form panel. Mobile: stacked, minimal.
 */
export function AuthShell({
  children,
  side,
}: {
  children: React.ReactNode;
  side?: React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <main className="grid min-h-screen lg:grid-cols-2" dir="ltr">
      {/* ===== brand panel ===== */}
      <aside className="brand-bg relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
        <div className="grid-texture absolute inset-0" />
        {/* gold ambient */}
        <div className="pointer-events-none absolute -right-32 top-1/3 h-[420px] w-[420px] rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-0 h-64 w-64 rounded-full bg-[#B8860B]/[0.08] blur-3xl" />

        <div className="relative flex items-center gap-3">
          <GymEmblem className="h-11 w-11" />
          <div className="leading-none">
            <div className="font-display text-lg font-black tracking-[0.1em] gold-text">
              MOKHTAR GYM
            </div>
            <div className="mt-1.5 text-[9px] font-semibold tracking-[0.4em] text-neutral-600">
              {t("common.tagline")}
            </div>
          </div>
        </div>

        <div className="relative">
          {side ?? (
            <div className="max-w-md">
              <h2 className="font-display text-[44px] font-black leading-[1.04] tracking-tight text-neutral-100">
                STRENGTH.<br />
                <span className="gold-text">DISCIPLINE.</span><br />
                RESULTS.
              </h2>
              <p className="mt-6 text-sm leading-relaxed text-neutral-500">
                {t("auth.loginSubtitle")}
              </p>
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-2 text-[11px] font-medium tracking-wide text-neutral-700">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          MOKHTAR GYM — FITNESS CLUB
        </div>
      </aside>

      {/* ===== form panel ===== */}
      <section
        className="brand-bg relative flex flex-col"
        dir="auto"
      >
        {/* mobile header */}
        <div className="flex items-center justify-between p-5 lg:hidden">
          <div className="flex items-center gap-2.5">
            <GymEmblem className="h-8 w-8" />
            <span className="font-display text-sm font-black tracking-[0.08em] gold-text">
              MOKHTAR GYM
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-8 sm:px-8">
          <div className={cn("w-full max-w-[400px]")}>
            {/* desktop language switcher */}
            <div className="mb-6 hidden justify-end gap-1 lg:flex">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}

/** Error inline banner */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="animate-fade-up rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] font-medium text-danger"
    >
      {message}
    </div>
  );
}
