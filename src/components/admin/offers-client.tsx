"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Tag, Archive, Eye } from "lucide-react";
import { useI18n } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState } from "@/components/client/ui";
import { saveOfferAction, archiveOfferAction } from "@/server-actions/admin-content";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OItem {
  id: string;
  title: string;
  description: string | null;
  planId: string | null;
  planNameAr: string | null;
  planNameFr: string | null;
  planNameEn: string | null;
  originalPrice: number | null;
  offerPrice: number;
  startDate: string;
  endDate: string;
  status: string;
}

export function OffersAdminClient({
  offers,
  plans,
}: {
  offers: OItem[];
  plans: { id: string; nameEn: string; price: number }[];
}) {
  const { t, pick, fmtDate, fmtMoney } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<OItem | null>(null);
  const [state, formAction, pending] = useMgAction(saveOfferAction, {
    onSuccess: () => {
      setOpen(false);
      toast.success(t("admin.offerSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });

  const archive = async (o: OItem) => {
    const res = await archiveOfferAction(o.id, o.status === "ACTIVE");
    if (res.ok) {
      toast.success(o.status === "ACTIVE" ? t("admin.offerArchived") : t("admin.offerSaved"));
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.offers")}
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.createOffer")}
        </button>
      </div>

      {offers.length === 0 ? (
        <EmptyState icon={Tag} title={t("admin.noOffers")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map((o) => {
            const discount =
              o.originalPrice && o.originalPrice > o.offerPrice
                ? Math.round(((o.originalPrice - o.offerPrice) / o.originalPrice) * 100)
                : null;
            return (
              <div key={o.id} className={cn("surface-card rounded-2xl p-4", o.status === "ARCHIVED" && "opacity-60")}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-black text-neutral-50">{o.title}</h3>
                  <StatusBadge tone={o.status === "ACTIVE" ? "active" : "inactive"} />
                </div>
                {o.description && (
                  <p className="mt-1.5 line-clamp-2 text-[12px] text-neutral-500">{o.description}</p>
                )}
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-display text-xl font-black text-primary tabular-nums">
                    {fmtMoney(o.offerPrice)}
                  </span>
                  {o.originalPrice && o.originalPrice > o.offerPrice && (
                    <span className="text-[13px] text-neutral-600 line-through tabular-nums">
                      {fmtMoney(o.originalPrice)}
                    </span>
                  )}
                  {discount && (
                    <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-black text-black">-{discount}%</span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] text-neutral-600">
                  {fmtDate(o.startDate)} → {fmtDate(o.endDate)}
                  {o.planNameEn ? ` · ${pick({ nameAr: o.planNameAr, nameFr: o.planNameFr, nameEn: o.planNameEn })}` : ""}
                </p>
                <div className="mt-3.5 flex gap-2 border-t border-[#1c1c1c] pt-3">
                  <button
                    onClick={() => setPreview(o)}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-700 text-[11px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {t("admin.preview")}
                  </button>
                  <button
                    onClick={() => archive(o)}
                    className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-neutral-700 text-[11px] font-bold text-neutral-400 transition-colors hover:border-danger/40 hover:text-danger"
                  >
                    <Archive className="h-3.5 w-3.5" />
                    {o.status === "ACTIVE" ? t("admin.archive") : t("admin.reactivate")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* preview dialog — what clients see */}
      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[12px] font-black tracking-[0.2em] text-neutral-600 uppercase">
              {t("admin.preview")} — {t("nav.offers")}
            </DialogTitle>
          </DialogHeader>
          {preview && (
            <div
              className="card-sheen gold-tinted-card relative overflow-hidden rounded-2xl border border-primary/30 p-5"
            >
              <p className="text-[10px] font-black tracking-[0.25em] text-primary/80 uppercase">
                {t("offers.title")}
              </p>
              <h3 className="font-display mt-1.5 text-[18px] font-black text-neutral-50">{preview.title}</h3>
              {preview.description && (
                <p className="mt-2 text-[12px] text-neutral-400">{preview.description}</p>
              )}
              <div className="mt-4 flex items-baseline gap-3">
                <span className="font-display text-3xl font-black text-primary tabular-nums">
                  {fmtMoney(preview.offerPrice)}
                </span>
                {preview.originalPrice && preview.originalPrice > preview.offerPrice && (
                  <span className="text-[14px] text-neutral-600 line-through">
                    {fmtMoney(preview.originalPrice)}
                  </span>
                )}
              </div>
              <p className="mt-3 border-t border-primary/15 pt-3 text-[11px] text-neutral-500">
                {t("offers.validUntil")} {fmtDate(preview.endDate)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.createOffer")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <Field id="of-title" name="title" label={t("admin.offerTitle")} required placeholder="OFFRE RENTRÉE — 3 MOIS" />
            <Field id="of-desc" name="description" label={t("common.description")} />
            <Field id="of-plan" name="planId" label={t("common.plan")}>
              <select id="of-plan" name="planId" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                <option value="">—</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nameEn} · {p.price} DA
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                id="of-original"
                name="originalPrice"
                type="number"
                min="0"
                step="50"
                label={t("admin.originalPrice")}
                dir="ltr"
              />
              <Field
                id="of-price"
                name="offerPrice"
                type="number"
                min="0"
                step="50"
                label={t("admin.offerPrice")}
                required
                dir="ltr"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="of-start" name="startDate" type="date" label={t("admin.publishDate")} required />
              <Field id="of-end" name="endDate" type="date" label={t("admin.expiryDate")} required />
            </div>
            <p className="text-[11px] text-neutral-600">{t("admin.offerHint")}</p>
            <SubmitButton pending={pending}>{t("common.create")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
