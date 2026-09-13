"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { StatTile } from "@/components/client/ui";
import { Field, SubmitButton } from "@/components/brand/field";
import { StatusBadge } from "@/components/brand/status-badge";
import { recordPaymentAction, deletePaymentAction } from "@/server-actions/admin";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PItem {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  method: string;
  status: string;
  paidAt: string;
  reference: string | null;
}

interface CItem {
  id: string;
  name: string;
  membershipId: string | null;
  planName: string | null;
}

const METHODS: { v: string; key: DictKey; color: string }[] = [
  { v: "CASH", key: "admin.cash", color: "#22C55E" },
  { v: "CCP", key: "admin.ccp", color: "#F5C400" },
  { v: "BARIDIMOB", key: "admin.baridimob", color: "#B8860B" },
  { v: "BANK", key: "admin.bank", color: "#6B5B1E" },
  { v: "ONLINE", key: "admin.online", color: "#8A6500" },
  { v: "OTHER", key: "admin.other", color: "#57542A" },
];

const RANGES: { v: string; key: DictKey }[] = [
  { v: "all", key: "common.all" },
  { v: "today", key: "common.today" },
  { v: "month", key: "admin.monthlyVisits" },
  { v: "30", key: "admin.last30" },
];

export function PaymentsClient({
  payments,
  pageCount,
  pageNum,
  totalCount,
  stats,
  methodTotals,
  clients,
  openNew,
  presetMember,
  range,
}: {
  payments: PItem[];
  pageCount: number;
  pageNum: number;
  totalCount: number;
  stats: { todayRevenue: number; monthRevenue: number; avg: number };
  methodTotals: Record<string, number>;
  clients: CItem[];
  openNew: boolean;
  presetMember: string | null;
  range: string;
}) {
  const { t, fmtMoney, fmtDate, fmtTime } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [newOpen, setNewOpen] = useState(openNew);
  const [state, formAction, pending] = useMgAction(recordPaymentAction, {
    onSuccess: () => {
      setNewOpen(false);
      toast.success(t("admin.paymentRecorded"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [deleteBusy, setDeleteBusy] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");

  const setRange = (v: string) => {
    const params = new URLSearchParams(searchParams);
    if (v === "all") params.delete("range");
    else params.set("range", v);
    params.delete("page");
    router.push(`${pathname}?${params}`);
  };

  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    router.push(`${pathname}?${params}`);
  };

  const remove = async (id: string) => {
    setDeleteBusy(id);
    const res = await deletePaymentAction(id);
    setDeleteBusy(null);
    if (res.ok) {
      toast.success(t("common.delete"));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  const totalAll = Object.values(methodTotals).reduce((s, v) => s + v, 0);
  const filteredClients = memberQuery
    ? clients.filter((c) => c.name.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 10)
    : clients.slice(0, 10);
  const selectedClient = clients.find((c) => c.id === presetMember);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
            {t("admin.payments")}
          </h1>
          <p className="mt-0.5 text-[12px] text-neutral-500">{t("admin.rows", { n: totalCount })}</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.recordPaymentFor")}
        </button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t("admin.todaysRevenue")} value={fmtMoney(stats.todayRevenue)} accent="gold" />
        <StatTile label={t("admin.monthlyRevenue")} value={fmtMoney(stats.monthRevenue)} accent="gold" />
        <StatTile label={t("admin.avgPayment")} value={fmtMoney(stats.avg)} />
      </div>

      {/* method breakdown */}
      <div className="surface-card rounded-2xl p-5">
        <h3 className="mb-3 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
          {t("admin.revenueByMethod")}
        </h3>
        <div className="flex h-2.5 overflow-hidden rounded-full" dir="ltr">
          {METHODS.map((m) => {
            const v = methodTotals[m.v] ?? 0;
            if (v === 0) return null;
            return (
              <div
                key={m.v}
                style={{ width: `${(v / totalAll) * 100}%`, background: m.color }}
                title={`${m.v}: ${v}`}
              />
            );
          })}
          {totalAll === 0 && <div className="w-full bg-[#1a1a1a]" />}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {METHODS.map((m) => (
            <div key={m.v} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: m.color }} />
              <span className="text-[10.5px] font-semibold text-neutral-400">{t(m.key)}</span>
              <span className="ms-auto text-[10.5px] font-bold text-neutral-300 tabular-nums">
                {fmtMoney(methodTotals[m.v] ?? 0)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* range filters */}
      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r.v}
            onClick={() => setRange(r.v)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
              range === r.v
                ? "bg-primary text-black"
                : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
            )}
          >
            {t(r.key)}
          </button>
        ))}
      </div>

      {/* table */}
      <div className="surface-card overflow-hidden rounded-2xl">
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1c1c1c]">
                {[t("common.member"), t("common.amount"), t("payments.method"), t("common.date"), t("admin.reference"), ""].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-start text-[10px] font-black tracking-[0.14em] text-neutral-600 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161616]">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[13px] text-neutral-600">
                    {t("admin.noPayments")}
                  </td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${p.memberId}`} className="text-[13px] font-semibold text-neutral-100 hover:text-primary">
                      {p.memberName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-display text-[14px] font-black text-primary tabular-nums">
                    {fmtMoney(p.amount)}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-300">
                    {t(METHODS.find((m) => m.v === p.method)?.key ?? "admin.other")}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-400">
                    {fmtDate(p.paidAt)} · {fmtTime(p.paidAt)}
                  </td>
                  <td className="px-4 py-3 text-[11.5px] text-neutral-600" dir="ltr">
                    {p.reference ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <button
                      onClick={() => remove(p.id)}
                      disabled={deleteBusy === p.id}
                      aria-label={t("common.delete")}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-danger/10 hover:text-danger"
                    >
                      {deleteBusy === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile cards */}
        <div className="divide-y divide-[#161616] lg:hidden">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold text-neutral-100">{p.memberName}</p>
                <p className="text-[11px] text-neutral-600">
                  {fmtDate(p.paidAt)} · {t(METHODS.find((m) => m.v === p.method)?.key ?? "admin.other")}
                </p>
              </div>
              <div className="text-end">
                <p className="font-display text-[14px] font-black text-primary tabular-nums">
                  {fmtMoney(p.amount)}
                </p>
                <button
                  onClick={() => remove(p.id)}
                  disabled={deleteBusy === p.id}
                  className="text-[10px] text-neutral-600 hover:text-danger"
                >
                  {t("common.delete")}
                </button>
              </div>
            </div>
          ))}
          {payments.length === 0 && (
            <p className="py-12 text-center text-[13px] text-neutral-600">{t("admin.noPayments")}</p>
          )}
        </div>
      </div>

      {/* pagination */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => goPage(pageNum - 1)}
            disabled={pageNum <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 rtl-flip" />
          </button>
          {Array.from({ length: Math.min(7, pageCount) }).map((_, i) => (
            <button
              key={i}
              onClick={() => goPage(i + 1)}
              className={cn(
                "h-9 min-w-9 rounded-lg px-2 text-[12px] font-bold tabular-nums transition-colors",
                pageNum === i + 1 ? "bg-primary text-black" : "border border-neutral-800 text-neutral-400"
              )}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => goPage(pageNum + 1)}
            disabled={pageNum >= pageCount}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4 rtl-flip" />
          </button>
        </div>
      )}

      {/* ===== new payment dialog ===== */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.recordPaymentFor")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-neutral-300">
                {t("admin.selectMember")} <span className="text-primary">*</span>
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="input-premium h-11 w-full rounded-lg ps-10 pe-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[#262626]">
                {filteredClients.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2.5 border-b border-[#1a1a1a] p-2.5 text-[13px] transition-colors last:border-0 hover:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name="userId"
                      value={c.id}
                      required
                      defaultChecked={presetMember === c.id}
                      className="accent-[#F5C400]"
                    />
                    <span className="flex-1 truncate font-semibold text-neutral-200">{c.name}</span>
                    {c.planName && <span className="text-[10px] text-neutral-600">{c.planName}</span>}
                  </label>
                ))}
              </div>
            </div>

            <Field
              id="pm-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="1"
              label={`${t("common.amount")} (DA)`}
              placeholder="2500"
              required
              dir="ltr"
            />
            <div className="grid grid-cols-2 gap-3">
              <Field id="pm-method" name="method" label={t("admin.paymentMethod")}>
                <select id="pm-method" name="method" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  {METHODS.map((m) => (
                    <option key={m.v} value={m.v}>
                      {t(m.key)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="pm-date" name="paidAt" type="date" label={t("common.date")} />
            </div>
            <Field id="pm-ref" name="reference" label={`${t("admin.reference")} (${t("common.optional")})`} dir="ltr" placeholder="MG-0001" />
            <Field id="pm-notes" name="notes" label={`${t("common.notes")} (${t("common.optional")})`} />
            <SubmitButton pending={pending}>{t("common.save")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
