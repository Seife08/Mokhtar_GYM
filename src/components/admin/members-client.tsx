"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  ChevronRight,
  ChevronLeft,
  Users,
  UserCheck,
  UserX,
  Clock,
  PauseCircle,
  MoreHorizontal,
  CheckCircle2,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { StatusBadge } from "@/components/brand/status-badge";
import { createMemberAction, setMemberStatusAction } from "@/server-actions/admin";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  accountStatus: string;
  membershipStatus: string;
  planName: string | null;
  planNameAr: string | null;
  planNameFr: string | null;
  remainingDays: number;
  endDate: string | null;
  lastVisit: string | null;
}

interface Plan {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  price: number;
  durationDays: number;
}

const M_STATUS_TONE: Record<string, "active" | "expiring" | "expired" | "paused" | "inactive"> = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring",
  EXPIRED: "expired",
  PAUSED: "paused",
  CANCELLED: "cancelled" as never,
  NONE: "inactive",
};

const FILTERS: { v: string; labelKey: DictKey; icon: React.ElementType }[] = [
  { v: "all", labelKey: "common.all", icon: Users },
  { v: "active", labelKey: "common.active", icon: UserCheck },
  { v: "expiring", labelKey: "common.expiringSoon", icon: Clock },
  { v: "expired", labelKey: "common.expired", icon: UserX },
  { v: "paused", labelKey: "common.paused", icon: PauseCircle },
  { v: "inactive", labelKey: "common.inactive", icon: UserX },
];

export function MembersClient({
  members,
  pageCount,
  pageNum,
  totalCount,
  search,
  filter,
  openNew,
  plans,
}: {
  members: Member[];
  pageCount: number;
  pageNum: number;
  totalCount: number;
  search: string;
  filter: string;
  openNew: boolean;
  plans: Plan[];
}) {
  const { t, pick, fmtDate, fmtMoney } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(search);
  const [newOpen, setNewOpen] = useState(openNew);
  const [state, formAction, pending] = useMgAction(createMemberAction, {
    onSuccess: () => {
      setNewOpen(false);
      toast.success(t("admin.memberSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounced search
  const onSearch = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set("q", value);
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params}`);
    }, 350);
  };

  const setFilter = (v: string) => {
    const params = new URLSearchParams(searchParams);
    if (v === "all") params.delete("filter");
    else params.set("filter", v);
    params.delete("page");
    router.push(`${pathname}?${params}`);
  };

  const goPage = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    router.push(`${pathname}?${params}`);
  };

  const toggleStatus = async (m: Member) => {
    const next = m.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const res = await setMemberStatusAction(m.id, next);
    if (res.ok) {
      toast.success(next === "ACTIVE" ? t("admin.memberReactivated") : t("admin.memberDeactivated"));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  return (
    <div className="space-y-4">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
            {t("admin.members")}
          </h1>
          <p className="mt-0.5 text-[12px] text-neutral-500">{t("admin.rows", { n: totalCount })}</p>
        </div>
        <button
          onClick={() => setNewOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.addMember")}
        </button>
      </div>

      {/* search + filters */}
      <div className="surface-card rounded-2xl p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-neutral-600" />
          <input
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("admin.searchMembers")}
            className="input-premium h-11 w-full rounded-lg ps-11 pe-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
          />
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11.5px] font-bold transition-colors",
                filter === f.v
                  ? "bg-primary text-black"
                  : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
              )}
            >
              <f.icon className="h-3.5 w-3.5" />
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* ===== table (desktop) ===== */}
      <div className="surface-card hidden overflow-hidden rounded-2xl lg:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1c1c1c] text-start">
              {[
                t("common.name"),
                t("common.phone"),
                t("common.plan"),
                t("common.status"),
                t("membership.expirationDate"),
                t("admin.lastAttendance"),
                "",
              ].map((h, i) => (
                <th key={i} className="px-4 py-3 text-start text-[10px] font-black tracking-[0.14em] text-neutral-600 uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#161616]">
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[13px] text-neutral-600">
                  {t("admin.noMembers")} — {t("admin.tryDifferentSearch")}
                </td>
              </tr>
            ) : (
              members.map((m, i) => (
                <motion.tr
                  key={m.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="group transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[12px] font-black text-primary">
                        {m.firstName.charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-semibold text-neutral-100">
                          {m.firstName} {m.lastName}
                        </p>
                        <p className="truncate text-[11px] text-neutral-600">{m.email}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-400 tabular-nums" dir="ltr">
                    {m.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-300">
                    {m.planName
                      ? pick({ nameAr: m.planNameAr, nameFr: m.planNameFr, nameEn: m.planName })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={M_STATUS_TONE[m.membershipStatus] ?? "inactive"} />
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-400">
                    {m.endDate ? (
                      <>
                        {fmtDate(m.endDate)}
                        {m.remainingDays > 0 && m.membershipStatus !== "EXPIRED" && (
                          <span className="ms-1.5 text-[10.5px] text-neutral-600">({m.remainingDays}d)</span>
                        )}
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-[12.5px] text-neutral-400">
                    {m.lastVisit ? fmtDate(m.lastVisit, { day: "numeric", month: "short" }) : t("admin.never")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/admin/members/${m.id}`}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-primary/10 hover:text-primary"
                        aria-label={t("common.view")}
                      >
                        <ChevronRight className="h-4.5 w-4.5 rtl-flip" />
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-white/5 hover:text-neutral-200">
                          <MoreHorizontal className="h-4.5 w-4.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="surface-elevated border-border/60">
                          <DropdownMenuItem
                            onClick={() => toggleStatus(m)}
                            className={m.accountStatus === "ACTIVE" ? "text-danger focus:text-danger focus:bg-danger/10" : "text-success focus:text-success focus:bg-success/10"}
                          >
                            {m.accountStatus === "ACTIVE" ? t("admin.deactivate") : t("admin.reactivate")}
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/members/${m.id}`}>{t("admin.memberDetail")}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/payments?member=${m.id}&new=1`}>{t("admin.recordPayment")}</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/memberships?member=${m.id}`}>{t("admin.assignMembership")}</Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ===== cards (mobile) ===== */}
      <div className="space-y-2.5 lg:hidden">
        {members.length === 0 ? (
          <div className="surface-card rounded-2xl py-12 text-center text-[13px] text-neutral-600">
            {t("admin.noMembers")}
          </div>
        ) : (
          members.map((m) => (
            <div key={m.id} className="surface-card rounded-xl p-4">
              <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1a1a1a] text-[14px] font-black text-primary">
                  {m.firstName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-bold text-neutral-100">
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="truncate text-[11px] text-neutral-600" dir="ltr">
                    {m.phone ?? m.email}
                  </p>
                </div>
                <StatusBadge tone={M_STATUS_TONE[m.membershipStatus] ?? "inactive"} />
              </Link>
              {m.planName && (
                <p className="mt-2.5 border-t border-[#181818] pt-2.5 text-[11.5px] text-neutral-500">
                  {pick({ nameAr: m.planNameAr, nameFr: m.planNameFr, nameEn: m.planName })}
                  {m.endDate && ` · ${fmtDate(m.endDate)}`}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* ===== pagination ===== */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={() => goPage(pageNum - 1)}
            disabled={pageNum <= 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4 rtl-flip" />
          </button>
          {Array.from({ length: pageCount }).slice(0, 7).map((_, i) => (
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

      {/* ===== new member dialog ===== */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="surface-elevated max-h-[88dvh] overflow-y-auto border-border/70 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[18px] font-black text-neutral-50">
              {t("admin.newMember")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field id="nm-first" name="firstName" label={t("common.firstName")} required />
              <Field id="nm-last" name="lastName" label={t("common.lastName")} required />
            </div>
            <Field id="nm-email" name="email" type="email" label={t("common.email")} dir="ltr" required />
            <div className="grid grid-cols-2 gap-3">
              <Field id="nm-phone" name="phone" type="tel" label={t("common.phone")} dir="ltr" />
              <Field id="nm-dob" name="dob" type="date" label={t("common.dateOfBirth")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="nm-pass" name="password" type="text" label={`${t("common.password")} (${t("common.optional")})`} dir="ltr" placeholder="Member@2026" />
              <Field id="nm-gender" name="gender" label={t("common.gender")}>
                <select
                  id="nm-gender"
                  name="gender"
                  className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100"
                >
                  <option value="male">{t("common.male")}</option>
                  <option value="female">{t("common.female")}</option>
                </select>
              </Field>
            </div>

            {/* optional membership */}
            <div className="rounded-xl border border-neutral-800 p-3.5">
              <p className="mb-3 flex items-center gap-1.5 text-[11px] font-black tracking-wide text-neutral-400 uppercase">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                {t("admin.assignMembership")} ({t("common.optional")})
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field id="nm-plan" name="planId" label={t("admin.selectPlan")}>
                  <select id="nm-plan" name="planId" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                    <option value="">—</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nameEn} · {p.price}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id="nm-start" name="startDate" type="date" label={t("membership.startDate")} />
                <Field id="nm-method" name="paymentMethod" label={t("admin.paymentMethod")}>
                  <select id="nm-method" name="paymentMethod" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                    {["CASH", "CCP", "BARIDIMOB", "BANK", "ONLINE", "OTHER"].map((mm) => (
                      <option key={mm} value={mm}>
                        {t(methodLabel(mm))}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <SubmitButton pending={pending}>{t("common.create")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function methodLabel(m: string): DictKey {
  const map: Record<string, DictKey> = {
    CASH: "admin.cash",
    CCP: "admin.ccp",
    BARIDIMOB: "admin.baridimob",
    BANK: "admin.bank",
    ONLINE: "admin.online",
    OTHER: "admin.other",
  };
  return map[m] ?? "admin.other";
}
