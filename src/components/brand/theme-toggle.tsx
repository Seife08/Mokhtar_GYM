"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

/**
 * Sun/Moon quick toggle. Matches the LanguageSwitcher trigger styling
 * so the two sit side-by-side in every header (client shell, admin
 * shell, auth pages, onboarding).
 */
export function ThemeToggle({
  variant = "ghost",
  className,
}: {
  variant?: "ghost" | "solid";
  className?: string;
}) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("settings.theme")}
      title={t("settings.theme")}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-lg outline-none transition-colors active:scale-95",
        variant === "ghost"
          ? "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
          : "bg-secondary text-neutral-200 hover:bg-secondary/70",
        className
      )}
    >
      {isLight ? (
        <Moon className="h-4.5 w-4.5" />
      ) : (
        <SunMedium className="h-4.5 w-4.5" />
      )}
    </button>
  );
}
