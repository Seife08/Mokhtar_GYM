"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Pause,
  Play,
  XCircle,
  CalendarPlus,
  Loader2,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { StatusBadge } from "@/components/brand/status-badge";
import { Field, SubmitButton } from "@/components/brand/field";
import { BrandTabs, BrandTabContent } from "@/components/brand/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  assignMembershipAction,
  membershipAction_,
  setMemberStatusAction,
} from "@/server-actions/admin";
import { useMgAction } from "@/lib/use-mg-action";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface M {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  gender: string | null;
  dob: string | null;
  accountStatus: string;
  createdAt: string;
  membershipStatus: string;
  plan: null | {
    nameAr: string;
    nameFr: string;
    nameEn: string;
    startDate: string;
    endDate: string;
    pricePaid: number;
    remainingDays: number;
    progress: number;
    paused: boolean;
  };
  totalVisits: number;
  lastVisit: string | null;
}

const STATUS_TONE: Record<string, "active" | "expiring" | "expired" | "paused" | "inactive"> = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring",
  EXPIRED: "expired",
  PAUSED: "paused",
  NONE: "inactive",
};

const GENDER_KEY: Record<string, DictKey> = {
  male: "common.male",
  female: "common.female",
  undisclosed: "common.preferNotSay",
};

export function MemberDetailClient({
  member,
  memberships,
  payments,
  attendances,
  workouts,
  diet,
  progress,
  bookings,
  plans,
  activeTab,
}: {
  member: M;
  memberships: {
    id: string;
    planNameAr: string;
    planNameFr: string;
    planNameEn: string;
    startDate: string;
    endDate: string;
    pricePaid: number;
    status: string;
    paused: boolean;
  }[];
  payments: {
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string;
    reference: string | null;
  }[];
  attendances: {
    id: string;
    checkInAt: string;
    checkOutAt: string | null;
    method: string;
  }[];
  workouts: {
    id: string;
    programNameAr: string;
    programNameFr: string;
    programNameEn: string;
    startDate: string;
    daysCount: number;
    days: { id: string; nameAr: string; nameFr: string; nameEn: string }[];
  }[];
  diet: null | {
    nameAr: string;
    nameFr: string;
    nameEn: string;
    totalCalories: number | null;
    meals: { id: string; type: string; foods: string; calories: number | null }[];
  };
  progress: {
    id: string;
    date: string;
    weight: number | null;
    chest: number | null;
    waist: number | null;
    arms: number | null;
    bodyFat: number | null;
  }[];
  bookings: {
    id: string;
    nameAr: string;
    nameFr: string;
    nameEn: string;
    date: string;
    status: string;
  }[];
  plans: { id: string; nameAr: string; nameFr: string; nameEn: string; price: number; durationDays: number }[];
  activeTab: string;
}) {
  const { t, pick, fmtDate, fmtMoney } = useI18n();
  const router = useRouter();
  const [assignOpen, setAssignOpen] = useState(false);
  const [state, formAction, pending] = useMgAction(assignMembershipAction, {
    onSuccess: () => {
      setAssignOpen(false);
      toast.success(t("admin.membershipAssigned"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [busyOp, setBusyOp] = useState<string | null>(null);

  const currentMembership = memberships[0];

  const doMembershipOp = async (op: "RENEW" | "PAUSE" | "RESUME" | "CANCEL" | "EXTEND", arg?: number) => {
    if (!currentMembership) return;
    setBusyOp(op);
    const res = await membershipAction_(currentMembership.id, op, arg);
    setBusyOp(null);
    if (res.ok) {
      const key: Record<string, string> = {
        RENEW: "admin.membershipRenewed",
        PAUSE: "admin.membershipPaused",
        RESUME: "admin.membershipResumed",
        CANCEL: "admin.membershipCancelled",
        EXTEND: "admin.membershipExtended",
      };
      toast.success(t(key[op] as never, { n: arg ?? 7 }));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  const toggleAccount = async () => {
    setBusyOp("account");
    const res = await setMemberStatusAction(
      member.id,
      member.accountStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    );
    setBusyOp(null);
    if (res.ok) {
      toast.success(
        member.accountStatus === "ACTIVE" ? t("admin.memberDeactivated") : t("admin.memberReactivated")
      );
      router.refresh();
    }
  };

  return (
    <div className="space-y-5">
      {/* ===== profile header ===== */}
      <div className="surface-card card-sheen rounded-2xl p-5">
        <div className="flex flex-wrap items-start gap-4">
          <span className="font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/25 bg-[#151515] text-2xl font-black text-primary">
            {member.firstName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[20px] font-black text-neutral-50">
                {member.firstName} {member.lastName}
              </h1>
              <StatusBadge tone={STATUS_TONE[member.membershipStatus] ?? "inactive"} />
              {member.accountStatus === "INACTIVE" && <StatusBadge tone="inactive" />}
            </div>
            <div className="mt-2 grid gap-x-6 gap-y-1 text-[12.5px] text-neutral-500 sm:grid-cols-2">
              <p dir="ltr">{member.email}</p>
              <p dir="ltr">{member.phone ?? "—"}</p>
              <p>
                {t("profile.memberSince")} {fmtDate(member.createdAt)}
              </p>
              <p>
                {t("common.gender")}: {t(GENDER_KEY[member.gender ?? "undisclosed"] ?? "common.preferNotSay")}
              </p>
            </div>
          </div>
        </div>

        {/* stats strip */}
        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-[#1c1c1c] pt-4">
          <div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">{t("admin.totalVisits")}</p>
            <p className="font-display mt-0.5 text-lg font-black text-primary tabular-nums">{member.totalVisits}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">{t("admin.lastAttendance")}</p>
            <p className="mt-0.5 text-[13px] font-semibold text-neutral-200">
              {member.lastVisit ? fmtDate(member.lastVisit) : t("admin.never")}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-neutral-600 uppercase">{t("payments.myPayments")}</p>
            <p className="font-display mt-0.5 text-lg font-black text-primary tabular-nums">
              {payments.length}
            </p>
          </div>
        </div>

        {/* membership actions */}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#1c1c1c] pt-4">
          <button
            onClick={() => setAssignOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[11.5px] font-extrabold text-black transition-colors hover:bg-[#ffd700]"
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            {currentMembership ? t("admin.renew") : t("admin.assignMembership")}
          </button>
          {currentMembership && (
            <>
              {member.membershipStatus === "PAUSED" ? (
                <OpButton icon={Play} label={t("admin.resume")} onClick={() => doMembershipOp("RESUME")} busy={busyOp === "RESUME"} />
              ) : (
                <OpButton icon={Pause} label={t("admin.pause")} onClick={() => doMembershipOp("PAUSE")} busy={busyOp === "PAUSE"} />
              )}
              <OpButton icon={CalendarPlus} label={t("admin.extend")} onClick={() => doMembershipOp("EXTEND", 7)} busy={busyOp === "EXTEND"} />
              <OpButton icon={XCircle} label={t("admin.cancelMembership")} danger onClick={() => doMembershipOp("CANCEL")} busy={busyOp === "CANCEL"} />
            </>
          )}
          <div className="ms-auto">
            <OpButton
              icon={member.accountStatus === "ACTIVE" ? Ban : CheckCircle2}
              label={member.accountStatus === "ACTIVE" ? t("admin.deactivate") : t("admin.reactivate")}
              danger={member.accountStatus === "ACTIVE"}
              onClick={toggleAccount}
              busy={busyOp === "account"}
            />
          </div>
        </div>
      </div>

      {/* ===== tabs ===== */}
      <BrandTabs
        defaultValue={activeTab}
        className="w-full"
        items={[
          { value: "overview", label: t("admin.overview") },
          { value: "membership", label: t("admin.memberships") },
          { value: "payments", label: t("admin.payments") },
          { value: "attendance", label: t("admin.attendance") },
          { value: "workout", label: t("admin.workouts") },
          { value: "diet", label: t("admin.dietPlans") },
          { value: "progress", label: t("admin.progress") },
          { value: "bookings", label: t("admin.bookings") },
        ]}
      >
        <BrandTabContent value="overview" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Panel title={t("membership.title")}>
              {member.plan ? (
                <div className="space-y-3">
                  <p className="font-display text-[15px] font-bold text-neutral-100">
                    {pick({ nameAr: member.plan.nameAr, nameFr: member.plan.nameFr, nameEn: member.plan.nameEn })}
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-black/60">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${member.plan.progress}%`,
                        background: "linear-gradient(90deg, #8A6500, #F5C400)",
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[12px]">
                    <KV k={t("membership.startDate")} v={fmtDate(member.plan.startDate)} />
                    <KV k={t("membership.expirationDate")} v={fmtDate(member.plan.endDate)} />
                    <KV k={t("common.price")} v={fmtMoney(member.plan.pricePaid)} gold />
                  </div>
                </div>
              ) : (
                <EmptyText text={t("admin.noMembershipForUser")} />
              )}
            </Panel>
            <Panel title={t("admin.workouts")}>
              {workouts.length > 0 ? (
                <div className="space-y-2">
                  {workouts.map((w) => (
                    <div key={w.id} className="flex items-center justify-between rounded-lg bg-[#121212] p-3">
                      <div>
                        <p className="text-[13px] font-semibold text-neutral-200">
                          {pick({ nameAr: w.programNameAr, nameFr: w.programNameFr, nameEn: w.programNameEn })}
                        </p>
                        <p className="text-[10.5px] text-neutral-600">
                          {w.daysCount} {t("workout.days")} · {fmtDate(w.startDate)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText text={t("workout.noWorkout")} />
              )}
            </Panel>
            <Panel title={t("admin.dietPlans")}>
              {diet ? (
                <div>
                  <p className="text-[13px] font-semibold text-neutral-200">
                    {pick({ nameAr: diet.nameAr, nameFr: diet.nameFr, nameEn: diet.nameEn })}
                  </p>
                  <p className="mt-1 text-[11.5px] text-neutral-500">
                    {diet.meals.length} {t("admin.meals")} · {diet.totalCalories ?? "—"} {t("diet.kcal")}
                  </p>
                </div>
              ) : (
                <EmptyText text={t("diet.noDiet")} />
              )}
            </Panel>
            <Panel title={t("admin.progress")}>
              {progress.length > 0 ? (
                <div className="space-y-1.5">
                  {progress.slice(0, 3).map((e) => (
                    <div key={e.id} className="flex justify-between text-[12px]">
                      <span className="text-neutral-500">{fmtDate(e.date)}</span>
                      <span className="font-semibold text-primary tabular-nums">
                        {e.weight ?? "—"} kg
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyText text={t("progress.noEntries")} />
              )}
            </Panel>
          </div>
        </BrandTabContent>

        <BrandTabContent value="membership" className="mt-4">
          <div className="surface-card divide-y divide-[#161616] rounded-2xl">
            {memberships.length === 0 && <EmptyText text={t("admin.noMembershipForUser")} />}
            {memberships.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-[13.5px] font-bold text-neutral-100">
                    {pick({ nameAr: m.planNameAr, nameFr: m.planNameFr, nameEn: m.planNameEn })}
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-neutral-500">
                    {fmtDate(m.startDate)} → {fmtDate(m.endDate)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-black text-primary tabular-nums">
                    {fmtMoney(m.pricePaid)}
                  </span>
                  <StatusBadge tone={STATUS_TONE[m.status] ?? "expired"} />
                </div>
              </div>
            ))}
          </div>
        </BrandTabContent>

        <BrandTabContent value="payments" className="mt-4">
          <div className="surface-card divide-y divide-[#161616] rounded-2xl">
            {payments.length === 0 && <EmptyText text={t("admin.noPayments")} />}
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="font-display text-[14px] font-black text-primary tabular-nums">
                    {fmtMoney(p.amount)}
                  </p>
                  <p className="text-[11.5px] text-neutral-500">
                    {fmtDate(p.paidAt)} · {t(methodKey(p.method))}
                  </p>
                </div>
                <StatusBadge tone={p.status === "PAID" ? "paid" : "pending"} />
              </div>
            ))}
          </div>
        </BrandTabContent>

        <BrandTabContent value="attendance" className="mt-4">
          <div className="surface-card divide-y divide-[#161616] rounded-2xl">
            {attendances.length === 0 && <EmptyText text={t("admin.never")} />}
            {attendances.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-3.5 text-[12.5px]">
                <span className="font-semibold text-neutral-300">{fmtDate(a.checkInAt, { weekday: "short", day: "numeric", month: "short" })}</span>
                <span className="text-neutral-500 tabular-nums">
                  {new Date(a.checkInAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                  {a.checkOutAt &&
                    ` → ${new Date(a.checkOutAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                </span>
                <span className="rounded bg-[#1a1a1a] px-1.5 py-0.5 text-[9px] font-bold text-neutral-500">
                  {a.method}
                </span>
              </div>
            ))}
          </div>
        </BrandTabContent>

        <BrandTabContent value="workout" className="mt-4">
          <div className="space-y-3">
            {workouts.length === 0 && (
              <div className="surface-card rounded-2xl py-10 text-center text-[13px] text-neutral-600">
                {t("workout.noWorkout")}
              </div>
            )}
            {workouts.map((w) => (
              <div key={w.id} className="surface-card rounded-2xl p-4">
                <p className="font-display text-[15px] font-black text-neutral-50">
                  {pick({ nameAr: w.programNameAr, nameFr: w.programNameFr, nameEn: w.programNameEn })}
                </p>
                <div className="mt-3 space-y-1.5">
                  {w.days.map((d, i) => (
                    <div key={d.id} className="flex items-center gap-2 text-[12.5px] text-neutral-400">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1a1a] text-[10px] font-black text-primary">
                        {i + 1}
                      </span>
                      {pick({ nameAr: d.nameAr, nameFr: d.nameFr, nameEn: d.nameEn })}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </BrandTabContent>

        <BrandTabContent value="diet" className="mt-4">
          {diet ? (
            <div className="surface-card rounded-2xl p-5">
              <p className="font-display text-[15px] font-black text-neutral-50">
                {pick({ nameAr: diet.nameAr, nameFr: diet.nameFr, nameEn: diet.nameEn })}
              </p>
              <div className="mt-3 divide-y divide-[#161616]">
                {diet.meals.map((m) => (
                  <div key={m.id} className="py-2.5">
                    <p className="text-[11px] font-black tracking-wide text-primary uppercase">{m.type}</p>
                    <p className="mt-0.5 text-[12.5px] text-neutral-400">{m.foods.replace(/\|/g, " · ")}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="surface-card rounded-2xl py-10 text-center text-[13px] text-neutral-600">
              {t("diet.noDiet")}
            </div>
          )}
        </BrandTabContent>

        <BrandTabContent value="progress" className="mt-4">
          <div className="surface-card overflow-hidden rounded-2xl">
            {progress.length === 0 ? (
              <EmptyText text={t("progress.noEntries")} />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1c1c1c]">
                    {[t("common.date"), "kg", t("progress.chest"), t("progress.waist"), t("progress.arms"), "BF%"].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-start text-[10px] font-black text-neutral-600 uppercase">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161616]">
                  {progress.map((e) => (
                    <tr key={e.id} className="text-[12.5px] text-neutral-300 tabular-nums">
                      <td className="px-4 py-2.5 text-neutral-500">{fmtDate(e.date)}</td>
                      <td className="px-4 py-2.5 font-bold text-primary">{e.weight ?? "—"}</td>
                      <td className="px-4 py-2.5">{e.chest ?? "—"}</td>
                      <td className="px-4 py-2.5">{e.waist ?? "—"}</td>
                      <td className="px-4 py-2.5">{e.arms ?? "—"}</td>
                      <td className="px-4 py-2.5">{e.bodyFat ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </BrandTabContent>

        <BrandTabContent value="bookings" className="mt-4">
          <div className="surface-card divide-y divide-[#161616] rounded-2xl">
            {bookings.length === 0 && <EmptyText text={t("classes.noBookings")} />}
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-[13.5px] font-bold text-neutral-100">
                    {pick({ nameAr: b.nameAr, nameFr: b.nameFr, nameEn: b.nameEn })}
                  </p>
                  <p className="text-[11.5px] text-neutral-500">{fmtDate(b.date, { day: "numeric", month: "short" })}</p>
                </div>
                <StatusBadge tone={b.status === "BOOKED" ? "booked" : b.status === "CANCELLED" ? "cancelled" : "active"} />
              </div>
            ))}
          </div>
        </BrandTabContent>
      </BrandTabs>

      {/* ===== assign membership dialog ===== */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.assignMembership")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="userId" value={member.id} />
            <Field id="am-plan" name="planId" label={t("admin.selectPlan")}>
              <select id="am-plan" name="planId" required className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                <option value="">—</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameEn} · {p.price} · {p.durationDays}d
                  </option>
                ))}
              </select>
            </Field>
            <Field id="am-start" name="startDate" type="date" label={t("membership.startDate")} required />
            <div className="grid grid-cols-2 gap-3">
              <Field id="am-method" name="paymentMethod" label={t("admin.paymentMethod")}>
                <select id="am-method" name="paymentMethod" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  {["CASH", "CCP", "BARIDIMOB", "BANK", "ONLINE", "OTHER"].map((mm) => (
                    <option key={mm} value={mm}>
                      {t(methodKey(mm))}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
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

function methodKey(m: string): DictKey {
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

function OpButton({
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
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-lg border px-3.5 text-[11.5px] font-bold transition-colors disabled:opacity-50",
        danger
          ? "border-danger/30 text-danger hover:bg-danger/10"
          : "border-neutral-700 text-neutral-300 hover:border-primary/40 hover:text-primary"
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="surface-card rounded-2xl p-4">
      <h3 className="mb-3 text-[10px] font-black tracking-[0.16em] text-neutral-600 uppercase">{title}</h3>
      {children}
    </div>
  );
}

function KV({ k, v, gold }: { k: string; v: string; gold?: boolean }) {
  return (
    <div>
      <p className="text-[9.5px] font-bold text-neutral-600 uppercase">{k}</p>
      <p className={cn("mt-0.5 text-[12.5px] font-semibold", gold ? "text-primary" : "text-neutral-200")}>{v}</p>
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <p className="py-8 text-center text-[13px] text-neutral-600">{text}</p>;
}
