"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, XCircle, CalendarClock, Users2, ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState } from "@/components/client/ui";
import { saveClassAction, cancelClassAction } from "@/server-actions/admin-content";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BrandTabs, BrandTabContent } from "@/components/brand/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CItem {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  date: string;
  durationMin: number;
  capacity: number;
  booked: number;
  instructor: string | null;
  status: string;
  attendees: { id: string; name: string }[];
}

export function ClassesAdminClient({
  upcoming,
  past,
}: {
  upcoming: CItem[];
  past: { id: string; nameEn: string; nameAr: string; nameFr: string; date: string; booked: number; status: string }[];
}) {
  const { t, pick, fmtDate, fmtTime } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useMgAction(saveClassAction, {
    onSuccess: () => {
      setOpen(false);
      toast.success(t("admin.classSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const cancelClass = async (id: string) => {
    if (!confirm(t("admin.cancelClassConfirm"))) return;
    const res = await cancelClassAction(id);
    if (res.ok) {
      toast.success(t("admin.classCancelled"));
      router.refresh();
    } else toast.error(t("validation.serverError"));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.classes")}
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.createClass")}
        </button>
      </div>

      <BrandTabs
        defaultValue="upcoming"
        className="w-full"
        items={[
          { value: "upcoming", label: t("admin.upcoming"), badge: upcoming.length },
          { value: "past", label: t("admin.past"), badge: past.length },
        ]}
      >

        <BrandTabContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarClock} title={t("admin.noClasses")} desc={t("admin.noClassesDesc")} />
          ) : (
            <div className="space-y-3">
              {upcoming.map((c) => {
                const isOpen = expanded === c.id;
                const full = c.booked >= c.capacity;
                return (
                  <div key={c.id} className="surface-card rounded-2xl">
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="font-display truncate text-[16px] font-black text-neutral-50">
                            {pick({ nameAr: c.nameAr, nameFr: c.nameFr, nameEn: c.nameEn })}
                          </h3>
                          {c.status === "CANCELLED" && <StatusBadge tone="cancelled" />}
                        </div>
                        <p className="mt-1 text-[11.5px] text-neutral-500">
                          {fmtDate(c.date, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                          {fmtTime(c.date)} · {c.durationMin} {t("common.minutes")}
                          {c.instructor ? ` · ${c.instructor}` : ""}
                        </p>
                        {/* capacity */}
                        <div className="mt-2.5 flex items-center gap-2.5">
                          <div className="h-1 w-32 overflow-hidden rounded-full bg-black/60">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                full ? "bg-danger" : "bg-gradient-to-r from-[#8A6500] to-[#F5C400]"
                              )}
                              style={{ width: `${Math.min(100, (c.booked / c.capacity) * 100)}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              "text-[11px] font-bold tabular-nums",
                              full ? "text-danger" : "text-neutral-500"
                            )}
                          >
                            {c.booked}/{c.capacity}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpanded(isOpen ? null : c.id)}
                          className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-700 px-3 text-[11px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
                        >
                          <Users2 className="h-3.5 w-3.5" />
                          {t("admin.attendees")}
                          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-180")} />
                        </button>
                        {c.status !== "CANCELLED" && (
                          <button
                            onClick={() => cancelClass(c.id)}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-danger/30 px-3 text-[11px] font-bold text-danger transition-colors hover:bg-danger/10"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            {t("admin.cancelled")}
                          </button>
                        )}
                      </div>
                    </div>
                    {isOpen && (
                      <div className="border-t border-[#1c1c1c] p-4">
                        <div className="flex flex-wrap gap-2">
                          {c.attendees.length === 0 ? (
                            <p className="text-[12px] text-neutral-600">{t("admin.noMembers")}</p>
                          ) : (
                            c.attendees.map((a) => (
                              <Link
                                key={a.id}
                                href={`/admin/members/${a.id}`}
                                className="flex items-center gap-2 rounded-lg bg-[#141414] px-3 py-1.5 text-[12px] font-semibold text-neutral-300 transition-colors hover:bg-primary/10 hover:text-primary"
                              >
                                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#1a1a1a] text-[10px] font-black text-primary">
                                  {a.name.charAt(0)}
                                </span>
                                {a.name}
                              </Link>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </BrandTabContent>

        <BrandTabContent value="past" className="mt-4">
          <div className="surface-card divide-y divide-[#161616] rounded-2xl">
            {past.length === 0 && (
              <p className="py-12 text-center text-[13px] text-neutral-600">{t("admin.noClasses")}</p>
            )}
            {past.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-[13.5px] font-bold text-neutral-100">
                    {pick({ nameAr: c.nameAr, nameFr: c.nameFr, nameEn: c.nameEn })}
                  </p>
                  <p className="text-[11.5px] text-neutral-500">
                    {fmtDate(c.date)} · {c.booked} {t("classes.booked") !== "BOOKED" ? t("admin.bookingsCount", { n: c.booked }) : ""}
                  </p>
                </div>
                <StatusBadge tone={c.status === "CANCELLED" ? "cancelled" : "completed"} />
              </div>
            ))}
          </div>
        </BrandTabContent>
      </BrandTabs>

      {/* create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.createClass")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-3 gap-2.5">
              <Field id="cl-en" name="nameEn" label="EN" placeholder="HIIT Express" required />
              <Field id="cl-ar" name="nameAr" label="AR" dir="rtl" placeholder="هيت" required />
              <Field id="cl-fr" name="nameFr" label="FR" placeholder="HIIT" required />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field id="cl-date" name="date" type="date" label={t("common.date")} required />
              <Field id="cl-time" name="time" type="time" label={t("common.time")} defaultValue="18:00" required />
              <Field id="cl-dur" name="durationMin" type="number" min="20" max="240" label={t("admin.durationMin")} defaultValue={60} required dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="cl-cap" name="capacity" type="number" min="1" max="100" label={t("admin.capacity")} defaultValue={20} required dir="ltr" />
              <Field id="cl-inst" name="instructor" label={t("classes.instructor")} placeholder="Coach" />
            </div>
            <Field id="cl-desc" name="description" label={t("common.description")} />
            <SubmitButton pending={pending}>{t("common.create")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
