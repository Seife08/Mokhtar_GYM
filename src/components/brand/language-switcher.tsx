"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages, Check } from "lucide-react";
import { useI18n, LOCALES, type Locale } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  variant = "ghost",
  className,
}: {
  variant?: "ghost" | "solid";
  className?: string;
}) {
  const { locale, setLocale, t } = useI18n();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const change = (l: Locale) => {
    if (l === locale) return;
    setLocale(l);
    // refresh server components to re-render with new direction
    startTransition(() => router.refresh());
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("common.language")}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium outline-none transition-colors",
          variant === "ghost"
            ? "text-neutral-400 hover:bg-white/5 hover:text-neutral-200"
            : "bg-secondary text-neutral-200 hover:bg-secondary/70",
          className
        )}
      >
        <Languages className="h-4 w-4" />
        <span className="hidden sm:inline">{LOCALES.find((l) => l.code === locale)?.label}</span>
        <span className="sm:hidden uppercase">{locale}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="surface-elevated border-border/60 min-w-[150px]"
      >
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => change(l.code)}
            className={cn(
              "flex items-center justify-between gap-3 focus:bg-accent focus:text-accent-foreground",
              l.code === locale && "text-primary"
            )}
          >
            <span className={l.code === "ar" ? "text-base" : ""}>{l.label}</span>
            {l.code === locale && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
