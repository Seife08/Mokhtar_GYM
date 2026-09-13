"use client";

import { Megaphone, AlertTriangle } from "lucide-react";
import { useI18n } from "@/i18n";
import { PageHeader, EmptyState } from "./ui";
import { cn } from "@/lib/utils";

interface AItem {
  id: string;
  title: string;
  body: string;
  priority: string;
  startDate: string;
}

export function AnnouncementsClient({ announcements }: { announcements: AItem[] }) {
  const { t, fmtDate } = useI18n();

  return (
    <div>
      <PageHeader title={t("ann.title")} />

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title={t("ann.none")} desc={t("ann.noneDesc")} />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <article
              key={a.id}
              className={cn(
                "surface-card rounded-2xl p-4",
                a.priority === "HIGH" && "border-warning/30 bg-warning/[0.03]"
              )}
            >
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
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14px] font-bold text-neutral-100">{a.title}</h3>
                  <p className="text-[10px] text-neutral-600">{fmtDate(a.startDate)}</p>
                </div>
                {a.priority === "HIGH" && (
                  <span className="shrink-0 rounded-md bg-warning/10 px-2 py-1 text-[9px] font-black tracking-wide text-warning uppercase">
                    {t("ann.priority.high")}
                  </span>
                )}
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-neutral-400">{a.body}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
