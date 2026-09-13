"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex items-center justify-between", className)}>
      <h2 className="text-[11px] font-black tracking-[0.22em] text-neutral-500 uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children?: React.ReactNode;
}) {
  const { dir } = useI18n();
  return (
    <div className="mb-5 flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-neutral-800 text-neutral-400 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5" />
            <path d={dir === "rtl" ? "M12 19l-7-7 7-7" : "M12 19l7-7-7-7"} />
          </svg>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="font-display truncate text-[22px] font-black tracking-tight text-neutral-50">
          {title}
        </h1>
        {subtitle && <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  desc?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up flex flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-800/80 bg-[#0d0d0d]/60 px-6 py-12 text-center">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#151515]">
          <Icon className="h-7 w-7 text-neutral-700" />
        </div>
      )}
      <p className="mt-4 text-[15px] font-bold text-neutral-300">{title}</p>
      {desc && <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-neutral-600">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  accent = "default",
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "default" | "gold" | "success" | "danger" | "warning";
  icon?: React.ElementType;
}) {
  const accentColor = {
    default: "text-neutral-100",
    gold: "text-primary",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
  }[accent];
  return (
    <div className="surface-card rounded-xl p-3.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 text-neutral-600" />}
        <p className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">{label}</p>
      </div>
      <p className={cn("font-display mt-1.5 text-xl font-black tabular-nums", accentColor)}>
        {value}
      </p>
      {sub && <p className="mt-0.5 text-[10px] text-neutral-600">{sub}</p>}
    </div>
  );
}
