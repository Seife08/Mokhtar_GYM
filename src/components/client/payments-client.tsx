"use client";

import { Receipt } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { PageHeader, EmptyState } from "./ui";
import { StatusBadge } from "@/components/brand/status-badge";

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

export function PaymentsClientPage({ payments }: { payments: PEntry[] }) {
  const { t, fmtMoney, fmtDate } = useI18n();

  return (
    <div>
      <PageHeader title={t("payments.myPayments")} />

      {payments.length === 0 ? (
        <EmptyState icon={Receipt} title={t("payments.none")} desc={t("payments.noneDesc")} />
      ) : (
        <div className="space-y-2.5">
          {payments.map((p) => (
            <div key={p.id} className="surface-card flex items-center justify-between rounded-xl p-4">
              <div className="min-w-0">
                <p className="font-display text-[16px] font-black text-primary tabular-nums">
                  {fmtMoney(p.amount)}
                </p>
                <p className="mt-1 text-[11.5px] text-neutral-500">
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
    </div>
  );
}
