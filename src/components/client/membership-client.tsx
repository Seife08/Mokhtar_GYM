"use client";

import { useI18n, type DictKey } from "@/i18n";
import { BrandTabs, BrandTabContent } from "@/components/brand/tabs";
import { PageHeader, EmptyState, SectionTitle } from "./ui";
import { MembershipCard } from "./membership-card";
import { StatusBadge } from "@/components/brand/status-badge";
import { CreditCard, History, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface MEntry {
  id: string;
  planName: string;
  planNameAr: string;
  planNameFr: string;
  startDate: string;
  endDate: string;
  pricePaid: number;
  status: string;
  remainingDays: number;
  progress: number;
  paused: boolean;
}

interface PEntry {
  id: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  reference: string | null;
}

const METHOD_KEY: Record<string, DictKey> = {
  CASH: "admin.cash",
  CCP: "admin.ccp",
  BARIDIMOB: "admin.baridimob",
  BANK: "admin.bank",
  ONLINE: "admin.online",
  OTHER: "admin.other",
};

const STATUS_TONE: Record<string, "active" | "expiring" | "expired" | "paused" | "cancelled"> = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring",
  EXPIRED: "expired",
  PAUSED: "paused",
  CANCELLED: "cancelled",
};

export function MembershipClient({
  current,
  history,
  payments,
}: {
  current: MEntry | null;
  history: MEntry[];
  payments: PEntry[];
}) {
  const { t, pick, fmtDate, fmtMoney } = useI18n();

  return (
    <div>
      <PageHeader title={t("nav.membership")} />

      <BrandTabs
        defaultValue="current"
        className="w-full"
        listClassName="grid grid-cols-3 justify-stretch"
        items={[
          { value: "current", label: t("membership.currentPlan") },
          { value: "history", label: t("membership.history") },
          { value: "payments", label: t("payments.myPayments") },
        ]}
      >

        {/* ===== current ===== */}
        <BrandTabContent value="current" className="mt-4">
          {current ? (
            <div className="space-y-4">
              <MembershipCard data={current} />
              <div className="surface-card rounded-xl p-4">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3.5">
                  <InfoRow label={t("membership.startDate")} value={fmtDate(current.startDate)} />
                  <InfoRow label={t("membership.expirationDate")} value={fmtDate(current.endDate)} />
                  <InfoRow
                    label={t("common.price")}
                    value={fmtMoney(current.pricePaid)}
                    gold
                  />
                  <InfoRow
                    label={t("membership.paymentStatus")}
                    value={t("common.paid")}
                    gold
                  />
                </div>
              </div>
            </div>
          ) : (
            <EmptyState
              icon={CreditCard}
              title={t("membership.noMembership")}
              desc={t("membership.noMembershipDesc")}
            />
          )}
        </BrandTabContent>

        {/* ===== history ===== */}
        <BrandTabContent value="history" className="mt-4">
          {history.length === 0 ? (
            <EmptyState icon={History} title={t("workout.noHistory")} />
          ) : (
            <div className="relative space-y-3 ps-4">
              {/* timeline line */}
              <div className="absolute bottom-3 start-[5px] top-3 w-px bg-neutral-800" />
              {history.map((m) => (
                <div key={m.id} className="relative">
                  <span
                    className={cn(
                      "absolute -start-4 top-5 h-2.5 w-2.5 rounded-full border-2 border-background",
                      m.status === "EXPIRED" || m.status === "CANCELLED" ? "bg-neutral-700" : "bg-primary"
                    )}
                  />
                  <div className="surface-card rounded-xl p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-[14px] font-bold text-neutral-100">
                        {pick({ nameAr: m.planNameAr, nameFr: m.planNameFr, nameEn: m.planName })}
                      </p>
                      <StatusBadge tone={STATUS_TONE[m.status] ?? "expired"} />
                    </div>
                    <p className="mt-1.5 text-[11px] text-neutral-500">
                      {fmtDate(m.startDate)} → {fmtDate(m.endDate)}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[13px] font-bold text-primary">
                        {fmtMoney(m.pricePaid)}
                      </span>
                      <StatusBadge tone="paid" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </BrandTabContent>

        {/* ===== payments ===== */}
        <BrandTabContent value="payments" className="mt-4">
          {payments.length === 0 ? (
            <EmptyState icon={Receipt} title={t("payments.none")} desc={t("payments.noneDesc")} />
          ) : (
            <div className="space-y-2.5">
              {payments.map((p) => (
                <div key={p.id} className="surface-card flex items-center justify-between rounded-xl p-4">
                  <div>
                    <p className="font-display text-[15px] font-black text-primary tabular-nums">
                      {fmtMoney(p.amount)}
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      {fmtDate(p.paidAt)} · {t(METHOD_KEY[p.method] ?? "admin.other")}
                    </p>
                    {p.reference && (
                      <p className="text-[10px] text-neutral-700" dir="ltr">
                        REF: {p.reference}
                      </p>
                    )}
                  </div>
                  <StatusBadge tone={p.status === "PAID" ? "paid" : "pending"} />
                </div>
              ))}
            </div>
          )}
        </BrandTabContent>
      </BrandTabs>
    </div>
  );
}

function InfoRow({
  label,
  value,
  gold,
}: {
  label: string;
  value: string;
  gold?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wide text-neutral-600 uppercase">{label}</p>
      <p className={cn("mt-1 text-[13px] font-semibold", gold ? "text-primary" : "text-neutral-200")}>
        {value}
      </p>
    </div>
  );
}
