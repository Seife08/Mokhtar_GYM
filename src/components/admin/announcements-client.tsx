"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Megaphone, Archive, AlertTriangle } from "lucide-react";
import { useI18n } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState } from "@/components/client/ui";
import { saveAnnouncementAction, archiveAnnouncementAction } from "@/server-actions/admin-content";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AItem {
  id: string;
  title: string;
  body: string;
  priority: string;
  startDate: string;
  endDate: string | null;
  status: string;
}

export function AnnouncementsAdminClient({
  announcements,
  openNew,
}: {
  announcements: AItem[];
  openNew: boolean;
}) {
  const { t, fmtDate } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(openNew);
  const [state, formAction, pending] = useMgAction(saveAnnouncementAction, {
    onSuccess: () => {
      setOpen(false);
      toast.success(t("admin.announcementSaved"));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });

  const archive = async (id: string) => {
    const res = await archiveAnnouncementAction(id);
    if (res.ok) {
      toast.success(t("admin.announcementArchived"));
      router.refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.announcements")}
        </h1>
        <button
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-extrabold tracking-wide text-black shadow-[0_8px_24px_-10px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95"
        >
          <Plus className="h-4.5 w-4.5" />
          {t("admin.createAnnouncement")}
        </button>
      </div>

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title={t("admin.noAnnouncements")} />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={cn(
                "surface-card rounded-2xl p-4",
                a.priority === "HIGH" && "border-warning/30 bg-warning/[0.03]",
                a.status === "ARCHIVED" && "opacity-60"
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      a.priority === "HIGH" ? "bg-warning/10" : "bg-[#151515]"
                    )}
                  >
                    {a.priority === "HIGH" ? (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    ) : (
                      <Megaphone className="h-5 w-5 text-neutral-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-[14.5px] font-bold text-neutral-100">{a.title}</h3>
                    <p className="text-[10.5px] text-neutral-600">
                      {fmtDate(a.startDate)}
                      {a.endDate ? ` → ${fmtDate(a.endDate)}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.priority === "HIGH" && (
                    <span className="rounded bg-warning/10 px-2 py-1 text-[9px] font-black text-warning uppercase">
                      {t("ann.priority.high")}
                    </span>
                  )}
                  <StatusBadge tone={a.status === "PUBLISHED" ? "active" : "inactive"} />
                </div>
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-neutral-400">{a.body}</p>
              {a.status === "PUBLISHED" && (
                <button
                  onClick={() => archive(a.id)}
                  className="mt-3 flex h-8 items-center gap-1.5 rounded-lg border border-neutral-700 px-3 text-[10.5px] font-bold text-neutral-400 transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Archive className="h-3 w-3" />
                  {t("admin.archive")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.createAnnouncement")}
            </DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <Field id="an-title" name="title" label={t("admin.notificationTitle")} required />
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-neutral-300" htmlFor="an-body">
                {t("admin.message")} <span className="text-primary">*</span>
              </label>
              <textarea
                id="an-body"
                name="body"
                rows={4}
                required
                className="input-premium w-full rounded-lg p-3 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                placeholder="…"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field id="an-priority" name="priority" label={t("admin.priority")}>
                <select id="an-priority" name="priority" className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                  <option value="NORMAL">NORMAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="LOW">LOW</option>
                </select>
              </Field>
              <Field id="an-start" name="startDate" type="date" label={t("admin.publishDate")} />
              <Field id="an-end" name="endDate" type="date" label={t("admin.expiryDate")} />
            </div>
            <label className="flex items-center gap-2.5 text-[13px] font-semibold text-neutral-300">
              <input type="checkbox" name="sendNotification" className="h-4 w-4 accent-[#F5C400]" />
              {t("admin.sendNotificationAlso")}
            </label>
            <SubmitButton pending={pending}>{t("admin.publish")}</SubmitButton>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
