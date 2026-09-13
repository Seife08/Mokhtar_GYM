"use client";

import { useState } from "react";
import { Plus, Archive, ArchiveRestore, Loader2, Layers, Pencil } from "lucide-react";
import { useI18n } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { EmptyState } from "@/components/client/ui";
import { savePlanAction, archivePlanAction } from "@/server-actions/admin";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/brand/status-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  descriptionEn: string | null;
  descriptionAr: string | null;
  descriptionFr: string | null;
  features: string | null;
  durationDays: number;
  price: number;
  status: string;
  activeMemberships: number;
}

export function PlansClient({ plans }: { plans: Plan[] }) {
  const { t, fmtMoney } = useI18n();
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [state, formAction, pending] = useMgAction(savePlanAction, {
    onSuccess: () => {
      setEditOpen(false);
      toast.success(t("admin.planSaved"));
      window.location.reload();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditOpen(true);
  };
  const openEdit = (p: Plan) => {
    setEditing(p);
    setEditOpen(true);
  };

  const toggleArchive = async (p: Plan) => {
    setBusyId(p.id);
    const res = await archivePlanAction(p.id, p.status === "ACTIVE");
    setBusyId(null);
    if (res.ok) {
      toast.success(p.status === "ACTIVE" ? t("admin.planArchived") : t("admin.planSaved"));
      window.location.reload();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.plans")}
        </h1>
        <button
          onClick={openNew}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.createPlan")}
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState icon={Layers} title={t("admin.noPlans")} desc={t("admin.noPlansDesc")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.id}
              className={cn(
                "surface-card card-sheen rounded-2xl p-5",
                p.status === "ARCHIVED" && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-[16px] font-black text-neutral-50">{p.nameEn}</h3>
                  <p className="mt-0.5 text-[12px] text-neutral-500">{p.nameAr} · {p.nameFr}</p>
                </div>
                <StatusBadge tone={p.status === "ACTIVE" ? "active" : "inactive"} />
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-[26px] font-black text-primary tabular-nums">
                  {fmtMoney(p.price)}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-neutral-500">
                {p.durationDays} {t("common.days")}
                {p.durationDays >= 365 ? ` · ${t("common.months")}: 12` : ""}
              </p>

              {p.features && (
                <ul className="mt-3 space-y-1.5">
                  {p.features.split("\n").slice(0, 4).map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-[12px] text-neutral-400">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                      {f.trim()}
                    </li>
                  ))}
                </ul>
              )}

              <p className="mt-3 text-[10.5px] text-neutral-600">
                {t("admin.planInUse", { n: p.activeMemberships })}
              </p>

              <div className="mt-4 flex gap-2 border-t border-[#1c1c1c] pt-3.5">
                <button
                  onClick={() => openEdit(p)}
                  className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-700 text-[11.5px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("common.edit")}
                </button>
                <button
                  onClick={() => toggleArchive(p)}
                  disabled={busyId === p.id}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border text-[11.5px] font-bold transition-colors",
                    p.status === "ACTIVE"
                      ? "border-neutral-700 text-neutral-400 hover:border-danger/40 hover:text-danger"
                      : "border-success/30 text-success hover:bg-success/10"
                  )}
                >
                  {busyId === p.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : p.status === "ACTIVE" ? (
                    <Archive className="h-3.5 w-3.5" />
                  ) : (
                    <ArchiveRestore className="h-3.5 w-3.5" />
                  )}
                  {p.status === "ACTIVE" ? t("admin.archive") : t("admin.reactivate")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== edit dialog ===== */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="surface-elevated max-h-[88dvh] overflow-y-auto border-border/70 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {editing ? t("admin.editPlan") : t("admin.createPlan")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="pl-en" name="nameEn" label={t("admin.nameEn")} defaultValue={editing?.nameEn} required />
              <Field id="pl-ar" name="nameAr" label={t("admin.nameAr")} defaultValue={editing?.nameAr} required dir="rtl" />
              <Field id="pl-fr" name="nameFr" label={t("admin.nameFr")} defaultValue={editing?.nameFr} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="pl-duration"
                name="durationDays"
                type="number"
                min="1"
                label={t("admin.durationDays")}
                defaultValue={editing?.durationDays ?? 30}
                required
                dir="ltr"
              />
              <Field
                id="pl-price"
                name="price"
                type="number"
                min="0"
                step="50"
                label={`${t("common.price")} (DA)`}
                defaultValue={editing?.price ?? 2500}
                required
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="pl-den" name="descriptionEn" label={`${t("common.description")} EN`} defaultValue={editing?.descriptionEn ?? ""} />
              <Field id="pl-dar" name="descriptionAr" label={`${t("common.description")} AR`} defaultValue={editing?.descriptionAr ?? ""} dir="rtl" />
              <Field id="pl-dfr" name="descriptionFr" label={`${t("common.description")} FR`} defaultValue={editing?.descriptionFr ?? ""} />
            </div>
            <Field
              id="pl-features"
              name="features"
              label={t("admin.features")}
              hint={t("admin.featuresHint")}
              defaultValue={editing?.features ?? ""}
            />
            <SubmitButton pending={pending}>{t("common.save")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
