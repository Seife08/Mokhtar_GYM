"use client";

import Link from "next/link";
import { useI18n } from "@/i18n";
import { GymEmblem } from "@/components/brand/logo";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="brand-bg grid-texture flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <GymEmblem className="h-16 w-16 opacity-70" />
      <p className="font-display mt-8 text-[72px] font-black leading-none gold-text">404</p>
      <h1 className="mt-3 text-[14px] font-black tracking-[0.22em] text-neutral-300 uppercase">
        {t("validation.notFoundTitle").replace("404 — ", "")}
      </h1>
      <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-neutral-600">
        {t("validation.notFoundDesc")}
      </p>
      <Link
        href="/"
        className="mt-8 flex h-11 items-center rounded-xl bg-primary px-8 text-[12.5px] font-extrabold tracking-wider text-black transition-all hover:bg-[#ffd700] active:scale-95"
      >
        {t("validation.backHome")}
      </Link>
    </main>
  );
}
