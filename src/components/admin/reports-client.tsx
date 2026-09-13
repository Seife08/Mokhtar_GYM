"use client";

import { useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download, Users, IdCard, Banknote, ScanLine, Dumbbell, CalendarCheck, Loader2 } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field } from "@/components/brand/field";
import { StatTile } from "@/components/client/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TYPES: { v: string; key: DictKey; icon: React.ElementType }[] = [
  { v: "members", key: "admin.memberReport", icon: Users },
  { v: "memberships", key: "admin.membershipReport", icon: IdCard },
  { v: "revenue", key: "admin.revenueReport", icon: Banknote },
  { v: "attendance", key: "admin.attendanceReport", icon: ScanLine },
  { v: "workouts", key: "admin.workoutReport", icon: Dumbbell },
  { v: "bookings", key: "admin.bookingReport", icon: CalendarCheck },
];

export function ReportsClient({
  reportType,
  titleKey,
  rows,
  from,
  to,
  totalAmount,
  csv,
}: {
  reportType: string;
  titleKey: string;
  rows: Record<string, string | number | null>[];
  from: string;
  to: string;
  totalAmount: number | null;
  csv: string;
}) {
  const { t, fmtMoney } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const setType = (v: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("type", v);
      router.push(`${pathname}?${params}`);
    });
  };

  const setDate = (key: "from" | "to", value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set(key, value);
      router.push(`${pathname}?${params}`);
    });
  };

  const downloadCsv = () => {
    if (!csv) {
      toast.error(t("admin.noPayments"));
      return;
    }
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mokhtar-gym-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("common.exportCsv"));
  };

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
        {t("admin.reports")}
      </h1>

      {/* type selector */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {TYPES.map((tp) => (
          <button
            key={tp.v}
            onClick={() => setType(tp.v)}
            disabled={pending}
            className={cn(
              "flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border transition-all",
              reportType === tp.v
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
            )}
          >
            {pending && reportType === tp.v ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <tp.icon className="h-5.5 w-5.5" />
            )}
            <span className="px-1 text-center text-[10.5px] font-bold leading-tight">{t(tp.key)}</span>
          </button>
        ))}
      </div>

      {/* controls */}
      <div className="surface-card flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <Field id="rp-from" type="date" label={t("common.from")} value={from} onChange={(e) => setDate("from", e.target.value)} className="w-40" />
        <Field id="rp-to" type="date" label={t("common.to")} value={to} onChange={(e) => setDate("to", e.target.value)} className="w-40" />
        <div className="ms-auto flex items-center gap-3">
          {totalAmount !== null && (
            <div className="min-w-32">
              <StatTile label={t("common.total")} value={fmtMoney(totalAmount)} accent="gold" />
            </div>
          )}
          <span className="text-[11.5px] font-bold text-neutral-500">{t("admin.rows", { n: rows.length })}</span>
          <button
            onClick={downloadCsv}
            disabled={rows.length === 0}
            className="flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-[12px] font-extrabold tracking-wide text-black transition-all hover:bg-[#ffd700] active:scale-95 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            {t("common.exportCsv")}
          </button>
        </div>
      </div>

      {/* table */}
      <div className="surface-card overflow-hidden rounded-2xl">
        <div className="border-b border-[#1c1c1c] p-4">
          <h2 className="text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            {t(titleKey as never)}
          </h2>
        </div>
        {rows.length === 0 ? (
          <p className="py-14 text-center text-[13px] text-neutral-600">{t("admin.noChange")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1c1c1c]">
                  {headers.map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-start text-[10px] font-black tracking-[0.12em] text-neutral-600 uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#161616]">
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i} className="text-[12px] text-neutral-300 transition-colors hover:bg-white/[0.02]">
                    {headers.map((h) => (
                      <td key={h} className="whitespace-nowrap px-4 py-2.5 tabular-nums">
                        {r[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && (
              <p className="border-t border-[#161616] p-3 text-center text-[11px] text-neutral-600">
                {t("admin.rows", { n: rows.length })} — {t("common.exportCsv")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
