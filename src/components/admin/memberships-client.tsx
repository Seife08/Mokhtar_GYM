"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { IdCard, Search, ChevronLeft, ChevronRight, Pause, Play, XCircle, CalendarPlus } from "lucide-react";
import { useI18n } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { StatusBadge } from "@/components/brand/status-badge";
import { assignMembershipAction, membershipAction_ } from "@/server-actions/admin";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface MEntry {
  id: string;
  memberId: string;
  memberName: string;
  planNameAr: string;
  planNameFr: string;
  planNameEn: string;
  startDate: string;
  endDate: string;
  pricePaid: number;
  status: string;
  rawStatus: string;
  remainingDays: number;
}

const STATUS_TONE: Record<string, "active" | "expiring" | "expired" | "paused" | "cancelled"> = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring",
  EXPIRED: "expired",
  PAUSED: "paused",
  CANCELLED: "cancelled",
};

const FILTERS = [
  { v: "all", label: "common.all" },
  { v: "active", label: "common.active" },
  { v: "expiring", label: "common.expiringSoon" },
  { v: "expired", label: "common.expired" },
  { v: "paused", label: "common.paused" },
  { v: "cancelled", label: "common.cancelled" },
] as const;

export function MembershipsClient({
  memberships,
  pageCount,
  pageNum,
  totalCount,
  filter,
  presetMember,
  plans,
  clients,
}: {
  memberships: MEntry[];
  pageCount: number;
  pageNum: number;
  totalCount: number;
  filter: string;
  presetMember: string | null;
  plans: { id: string; nameEn: string; nameAr: string; nameFr: string; price: number; durationDays: number }[];
  clients: { id: string; name: string }[];
}) {
  const { t, pick, fmtDate, fmtMoney } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [assignOpen, setAssignOpen] = useState(!!presetMember);
  const [state, formAction, pending] = useMgAction(assignMembershipAction, {
    onSuccess: () => {
      setAssignOpen(false);
      toast.success(t("admin.membershipAssigned"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [memberQuery, setMemberQuery] = useState("");

  const setFilter = (v: string) => {
    const params = new URLSearchParams(searchParams);
    if (v === "all") params.delete("status");
    else params.set("status", v);
    params.delete("page");
    router.push(`${pathname}?${params}`);
  };

  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    router.push(`${pathname}?${params}`);
  };

  const doOp = async (m: MEntry, op: "RENEW" | "PAUSE" | "RESUME" | "CANCEL" | "EXTEND") => {
    setBusyId(m.id + op);
    const res = await membershipAction_(m.id, op, op === "EXTEND" ? 7 : undefined);
    setBusyId(null);
    if (res.ok) {
      const key: Record<string, string> = {
        RENEW: "admin.membershipRenewed",
        PAUSE: "admin.membershipPaused",
        RESUME: "admin.membershipResumed",
        CANCEL: "admin.membershipCancelled",
        EXTEND: "admin.membershipExtended",
      };
      toast.success(t(key[op] as never, { n: 7 }));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  const filteredClients = memberQuery
    ? clients.filter((c) => c.name.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 8)
    : clients.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.memberships")}
        </h1>
        <button
          onClick={() => setAssignOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <IdCard className="h-4.5 w-4.5" />
          {t("admin.assignMembership")}
        </button>
      </div>

      {/* filters */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.v}
            onClick={() => setFilter(f.v)}
            className={cn(
              "shrink-0 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
              filter === f.v
                ? "bg-primary text-black"
                : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
            )}
          >
            {t(f.label as never)}
          </button>
        ))}
        <span className="ms-auto shrink-0 self-center text-[11px] text-neutral-600">
          {t("admin.rows", { n: totalCount })}
        </span>
      </div>

      {/* table / cards */}
      <div className="surface-card overflow-hidden rounded-2xl">
        <div className="hidden lg:block">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1c1c1c]">
                {[
                  t("common.member"),
                  t("common.plan"),
                  t("membership.startDate"),
                  t("membership.expirationDate"),
                  t("common.remaining"),
                  t("common.status"),
                  t("common.actions"),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-start text-[10px] font-black tracking-[0.14em] text-neutral-600 uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#161616]">
              {memberships.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px] text-neutral-600">
                    {t("admin.noMembers")}
                  </td>
                </tr>
              )}
              {memberships.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.memberId}`} className="text-[13px] font-semibold text-neutral-100 hover:text-primary">
                      {m.memberName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-300">
                    {pick({ nameAr: m.planNameAr, nameFr: m.planNameFr, nameEn: m.planNameEn })}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-400">{fmtDate(m.startDate)}</td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-400">{fmtDate(m.endDate)}</td>
                  <td className="px-4 py-3">
                    <span className="text-[12.5px] font-bold text-primary tabular-nums">
                      {m.status === "EXPIRED" ? "—" : `${m.remainingDays}d`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS_TONE[m.status] ?? "expired"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {m.status !== "PAUSED" && m.status !== "EXPIRED" && m.status !== "CANCELLED" && (
                        <IconOp
                          icon={Pause}
                          label={t("admin.pause")}
                          busy={busyId === m.id + "PAUSE"}
                          onClick={() => doOp(m, "PAUSE")}
                        />
                      )}
                      {m.status === "PAUSED" && (
                        <IconOp icon={Play} label={t("admin.resume")} busy={busyId === m.id + "RESUME"} onClick={() => doOp(m, "RESUME")} />
                      )}
                      {(m.status === "EXPIRED" || m.status === "EXPIRING_SOON") && (
                        <IconOp
                          icon={CalendarPlus}
                          label={t("admin.renew")}
                          busy={busyId === m.id + "RENEW"}
                          onClick={() => doOp(m, "RENEW")}
                        />
                      )}
                      {m.status !== "CANCELLED" && m.status !== "EXPIRED" && (
                        <IconOp icon={XCircle} label={t("admin.cancelMembership")} danger busy={busyId === m.id + "CANCEL"} onClick={() => doOp(m, "CANCEL")} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* mobile */}
        <div className="divide-y divide-[#161616] lg:hidden">
          {memberships.map((m) => (
            <div key={m.id} className="p-4">
              <div className="flex items-center justify-between">
                <Link href={`/admin/members/${m.memberId}`} className="text-[13.5px] font-bold text-neutral-100">
                  {m.memberName}
                </Link>
                <StatusBadge tone={STATUS_TONE[m.status] ?? "expired"} />
              </div>
              <p className="mt-1 text-[11.5px] text-neutral-500">
                {pick({ nameAr: m.planNameAr, nameFr: m.planNameFr, nameEn: m.planNameEn })} ·{" "}
                {fmtDate(m.startDate)} → {fmtDate(m.endDate)}
              </p>
            </div>
          ))}
          {memberships.length === 0 && (
            <p className="py-12 text-center text-[13px] text-neutral-600">{t("admin.noMembers")}</p>
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
                "h-9 min-w-9 rounded-lg px-2 text-[12px] font-bold tabular-nums",
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

      {/* assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.assignMembership")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-neutral-300">{t("admin.selectMember")}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="input-premium h-11 w-full rounded-lg ps-10 pe-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>
              <div className="max-h-36 overflow-y-auto rounded-lg border border-[#262626]">
                {filteredClients.map((c) => (
                  <label key={c.id} className="flex cursor-pointer items-center gap-2.5 border-b border-[#1a1a1a] p-2.5 text-[13px] last:border-0 hover:bg-primary/5">
                    <input
                      type="radio"
                      name="userId"
                      value={c.id}
                      required
                      defaultChecked={presetMember === c.id}
                      className="accent-[#F5C400]"
                    />
                    <span className="flex-1 truncate font-semibold text-neutral-200">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Field id="ms-plan" name="planId" label={t("admin.selectPlan")}>
              <select id="ms-plan" name="planId" required className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                <option value="">—</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameEn} · {p.price} DA · {p.durationDays}d
                  </option>
                ))}
              </select>
            </Field>
            <Field id="ms-start" name="startDate" type="date" label={t("membership.startDate")} required />
            <label className="flex items-center gap-2.5 text-[13px] font-semibold text-neutral-300">
              <input type="checkbox" name="recordPayment" defaultChecked className="h-4 w-4 accent-[#F5C400]" />
              {t("admin.recordPaymentToo")}
            </label>
            {state && !state.ok && <p className="text-xs text-danger">{t(state.error as never)}</p>}
            <SubmitButton pending={pending}>{t("common.confirm")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IconOp({
  icon: Icon,
  label,
  onClick,
  danger,
  busy,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      title={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
        danger
          ? "text-neutral-500 hover:bg-danger/10 hover:text-danger"
          : "text-neutral-500 hover:bg-primary/10 hover:text-primary"
      )}
    >
      {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" /> : <Icon className="h-4 w-4" />}
    </button>
  );
}
