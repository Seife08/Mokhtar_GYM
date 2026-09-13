"use client";

import { motion } from "framer-motion";
import { Tag, Clock, ArrowRight } from "lucide-react";
import { useI18n } from "@/i18n";
import { PageHeader, EmptyState } from "./ui";
import { cn } from "@/lib/utils";

interface OItem {
  id: string;
  title: string;
  description: string | null;
  originalPrice: number | null;
  offerPrice: number;
  endDate: string;
  planNameEn: string | null;
  planNameAr: string | null;
  planNameFr: string | null;
}

export function OffersClient({ offers }: { offers: OItem[] }) {
  const { t, pick, fmtDate, fmtMoney } = useI18n();

  return (
    <div>
      <PageHeader title={t("offers.title")} />

      {offers.length === 0 ? (
        <EmptyState icon={Tag} title={t("offers.none")} desc={t("offers.noneDesc")} />
      ) : (
        <div className="space-y-4">
          {offers.map((o, i) => {
            const discount =
              o.originalPrice && o.originalPrice > o.offerPrice
                ? Math.round(((o.originalPrice - o.offerPrice) / o.originalPrice) * 100)
                : null;
            const daysLeft = Math.ceil(
              (new Date(o.endDate).getTime() - Date.now()) / 86400000
            );
            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.35 }}
                className="card-sheen relative overflow-hidden rounded-2xl border border-primary/30 p-5"
                style={{
                  background:
                    "linear-gradient(150deg, #1a150c 0%, #0e0c07 55%, #16110a 100%)",
                }}
              >
                {/* save badge */}
                {discount && (
                  <span className="absolute end-0 top-0 rounded-bs-2xl bg-primary px-3.5 py-1.5 text-[12px] font-black text-black">
                    -{discount}%
                  </span>
                )}

                <p className="text-[10px] font-black tracking-[0.25em] text-primary/80 uppercase">
                  {t("offers.title")}
                </p>
                <h3 className="font-display mt-1.5 max-w-[80%] text-[18px] font-black leading-snug text-neutral-50">
                  {o.title}
                </h3>
                {o.description && (
                  <p className="mt-2 text-[12px] leading-relaxed text-neutral-400">
                    {o.description}
                  </p>
                )}
                {o.planNameEn && (
                  <p className="mt-1.5 text-[11px] font-bold text-neutral-500">
                    {pick({ nameAr: o.planNameAr, nameFr: o.planNameFr, nameEn: o.planNameEn })}
                  </p>
                )}

                {/* price */}
                <div className="mt-4 flex items-baseline gap-3">
                  <span className="font-display text-3xl font-black text-primary tabular-nums">
                    {fmtMoney(o.offerPrice)}
                  </span>
                  {o.originalPrice && o.originalPrice > o.offerPrice && (
                    <span className="text-[14px] font-semibold text-neutral-600 line-through tabular-nums">
                      {fmtMoney(o.originalPrice)}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-primary/15 pt-3">
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
                    <Clock className="h-3.5 w-3.5" />
                    {t("offers.validUntil")} {fmtDate(o.endDate)}
                  </span>
                  {daysLeft <= 7 && (
                    <span className="text-[11px] font-black text-warning">
                      {t("offers.endsIn", { n: daysLeft })}
                    </span>
                  )}
                </div>

                <p className={cn("mt-3 text-center text-[10.5px] text-neutral-600")}>
                  {t("offers.showAtReception")}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
