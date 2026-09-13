"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Salad, UserPlus, Search, ChevronRight } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { EmptyState } from "@/components/client/ui";
import { StatusBadge } from "@/components/brand/status-badge";
import { saveDietPlanAction, assignDietAction } from "@/server-actions/admin-content";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const GOALS: { v: string; key: DictKey }[] = [
  { v: "mass", key: "enum.mass" },
  { v: "cut", key: "enum.cut" },
  { v: "maintain", key: "enum.maintain" },
];

export function DietPlansClient({
  plans,
  clients,
}: {
  plans: {
    id: string;
    nameEn: string;
    nameAr: string;
    nameFr: string;
    goal: string | null;
    totalCalories: number | null;
    status: string;
    mealCount: number;
    computedCalories: number;
    assignedCount: number;
  }[];
  clients: { id: string; name: string }[];
}) {
  const { t, pick } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");
  const [planState, planFormAction, planPending] = useMgAction(saveDietPlanAction, {
    onSuccess: () => {
      setOpen(false);
      toast.success(t("admin.dietSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [assignState, assignFormAction, assignPending] = useMgAction(assignDietAction, {
    onSuccess: () => {
      setAssignOpen(false);
      toast.success(t("admin.dietAssigned"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });

  const filteredClients = memberQuery
    ? clients.filter((c) => c.name.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 8)
    : clients.slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.dietPlans")}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setAssignOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg border border-neutral-700 px-4 text-[12.5px] font-bold text-neutral-200 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <UserPlus className="h-4.5 w-4.5" />
            {t("admin.assignDiet")}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
          >
            <Plus className="h-4.5 w-4.5" />
            {t("admin.createDiet")}
          </button>
        </div>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={Salad} title={t("admin.noDiets")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <div key={p.id} className="surface-card card-sheen rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/admin/diet-plans/${p.id}`} className="group min-w-0">
                  <h3 className="font-display truncate text-[16px] font-black text-neutral-50 group-hover:text-primary">
                    {pick({ nameAr: p.nameAr, nameFr: p.nameFr, nameEn: p.nameEn })}
                  </h3>
                </Link>
                <StatusBadge tone={p.status === "ACTIVE" ? "active" : "inactive"} />
              </div>
              {p.goal && (
                <span className="mt-2 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {t(GOALS.find((g) => g.v === p.goal)?.key ?? "enum.maintain")}
                </span>
              )}
              <p className="font-display mt-3 text-[24px] font-black text-primary tabular-nums">
                {p.totalCalories ?? p.computedCalories}
                <span className="ms-1.5 text-[11px] font-bold text-neutral-500">{t("diet.kcal")}</span>
              </p>
              <p className="mt-1 text-[11.5px] text-neutral-500">
                {p.mealCount} {t("admin.meals")} · {t("admin.planInUse", { n: p.assignedCount })}
              </p>
              <Link
                href={`/admin/diet-plans/${p.id}`}
                className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-lg border border-neutral-700 text-[11.5px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
              >
                {t("admin.meals")}
                <ChevronRight className="h-3.5 w-3.5 rtl-flip" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* new plan dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.createDiet")}
            </DialogTitle>
          </DialogHeader>
          <form action={planFormAction} className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="dp-en" name="nameEn" label="EN" required />
              <Field id="dp-ar" name="nameAr" label="AR" dir="rtl" required />
              <Field id="dp-fr" name="nameFr" label="FR" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="dp-goal" name="goal" label={t("admin.goal")}>
                <select id="dp-goal" name="goal" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  {GOALS.map((g) => (
                    <option key={g.v} value={g.v}>
                      {t(g.key)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                id="dp-cal"
                name="totalCalories"
                type="number"
                min="0"
                label={t("admin.totalCalories")}
                placeholder="2800"
                dir="ltr"
              />
            </div>
            <Field id="dp-desc" name="description" label={t("common.description")} />
            <SubmitButton pending={planPending}>{t("common.create")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>

      {/* assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.assignDiet")}
            </DialogTitle>
          </DialogHeader>
          <form action={assignFormAction} className="space-y-4">
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
                    <input type="radio" name="userId" value={c.id} required className="accent-[#F5C400]" />
                    <span className="flex-1 truncate font-semibold text-neutral-200">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <Field id="da-plan" name="dietPlanId" label={t("admin.dietPlans")}>
              <select id="da-plan" name="dietPlanId" required className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                <option value="">—</option>
                {plans
                  .filter((p) => p.status === "ACTIVE")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nameEn}
                    </option>
                  ))}
              </select>
            </Field>
            <SubmitButton pending={assignPending}>{t("common.confirm")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
