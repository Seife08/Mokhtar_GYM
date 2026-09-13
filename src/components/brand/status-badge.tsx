"use client";

import { cn } from "@/lib/utils";
import { useI18n, type DictKey } from "@/i18n";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle, Clock } from "lucide-react";

type Tone = "active" | "expired" | "expiring" | "paused" | "cancelled" | "inactive" | "paid" | "pending" | "booked" | "draft" | "scheduled";

const toneMap: Record<Tone, { key: DictKey; className: string; icon: React.ElementType }> = {
  active: { key: "common.active", className: "bg-success/10 text-success border-success/25", icon: CheckCircle2 },
  expired: { key: "common.expired", className: "bg-danger/10 text-danger border-danger/25", icon: XCircle },
  expiring: { key: "common.expiringSoon", className: "bg-warning/10 text-warning border-warning/25", icon: AlertTriangle },
  paused: { key: "common.paused", className: "bg-warning/10 text-[#e3b53e] border-warning/25", icon: MinusCircle },
  cancelled: { key: "common.cancelled", className: "bg-neutral-800 text-neutral-400 border-neutral-700", icon: XCircle },
  inactive: { key: "common.inactive", className: "bg-neutral-800 text-neutral-400 border-neutral-700", icon: MinusCircle },
  paid: { key: "common.paid", className: "bg-success/10 text-success border-success/25", icon: CheckCircle2 },
  pending: { key: "common.pending", className: "bg-warning/10 text-warning border-warning/25", icon: Clock },
  booked: { key: "classes.booked", className: "bg-primary/10 text-primary border-primary/25", icon: CheckCircle2 },
  draft: { key: "common.pending", className: "bg-neutral-800 text-neutral-400 border-neutral-700", icon: Clock },
  scheduled: { key: "admin.scheduled", className: "bg-info/10 text-[#5ea0f5] border-info/25", icon: Clock },
};

/** Status chip with icon + label (never color alone) */
export function StatusBadge({
  tone,
  className,
  label,
}: {
  tone: Tone;
  className?: string;
  label?: string;
}) {
  const { t } = useI18n();
  const conf = toneMap[tone] ?? toneMap.inactive;
  const Icon = conf.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-bold tracking-wide",
        conf.className,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label ?? t(conf.key)}
    </span>
  );
}

/** Small gold dot indicator for charts/tables */
export function Dot({ className }: { className?: string }) {
  return <span className={cn("inline-block h-2 w-2 rounded-full bg-primary", className)} />;
}
