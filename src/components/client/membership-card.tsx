"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, AlertTriangle } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

interface MembershipCardData {
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED" | "PAUSED" | "CANCELLED" | "NONE";
  planName: string;
  remainingDays: number;
  endDate: string;
  progress: number;
}

/**
 * The flagship membership card — metallic gold on black, sheen on hover.
 */
export function MembershipCard({ data }: { data: MembershipCardData }) {
  const { t, locale } = useI18n();
  const { dir } = useI18n();

  const statusColor =
    data.status === "ACTIVE"
      ? "text-success"
      : data.status === "EXPIRING_SOON"
        ? "text-warning"
        : "text-danger";

  const fmtEnd = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-GB",
    { day: "numeric", month: "long", year: "numeric" }
  ).format(new Date(data.endDate));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.6, 0.35, 1] }}
      className="card-sheen relative overflow-hidden rounded-2xl border border-primary/25 p-5"
      style={{
        background:
          "linear-gradient(145deg, #191510 0%, #100d09 45%, #17120b 100%)",
      }}
    >
      {/* corner emblem watermark */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle, #F5C400 0%, transparent 70%)",
        }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-[10px] font-black tracking-[0.28em] text-neutral-500">
            {t("membership.title")}
          </p>
          <p className={cn("font-display mt-1.5 text-lg font-black tracking-wide", statusColor)}>
            {data.status === "ACTIVE"
              ? t("membership.activeTitle")
              : data.status === "EXPIRING_SOON"
                ? t("common.expiringSoon")
                : data.status === "PAUSED"
                  ? t("common.paused")
                  : t("home.expiredTitle")}
          </p>
        </div>
        {data.status === "EXPIRING_SOON" && (
          <AlertTriangle className="h-5 w-5 text-warning" />
        )}
      </div>

      <p className="font-display relative mt-4 text-[15px] font-bold text-neutral-100">
        {data.planName}
      </p>

      {data.status !== "EXPIRED" && data.status !== "NONE" ? (
        <>
          {/* progress bar = time used */}
          <div className="relative mt-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-black/60">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, data.progress)}%`,
                  background:
                    "linear-gradient(90deg, #8A6500, #F5C400, #FFE066)",
                }}
              />
            </div>
          </div>
          <div className="relative mt-3 flex items-end justify-between">
            <div>
              <span className="font-display text-[26px] font-black leading-none text-primary tabular-nums">
                {data.remainingDays}
              </span>
              <span className="ms-1.5 text-[11px] font-bold text-neutral-500">
                {t("membership.days")}
              </span>
            </div>
            <div className="text-end">
              <p className="text-[9px] font-bold tracking-wider text-neutral-600 uppercase">
                {t("membership.expirationDate")}
              </p>
              <p className="mt-0.5 text-[12px] font-semibold text-neutral-300">{fmtEnd}</p>
            </div>
          </div>
        </>
      ) : (
        <div className="relative mt-4">
          <p className="text-[13px] leading-relaxed text-neutral-400">
            {t("home.expiredDesc")}
          </p>
        </div>
      )}

      <Link
        href="/client/membership"
        className="relative mt-5 flex h-10 items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-[12px] font-extrabold tracking-wide text-primary transition-colors hover:bg-primary/20"
      >
        {data.status === "EXPIRED" || data.status === "NONE"
          ? t("home.renewMembership")
          : t("home.viewMembership")}
        <ChevronRight className="h-4 w-4 rtl-flip" />
      </Link>
    </motion.div>
  );
}
