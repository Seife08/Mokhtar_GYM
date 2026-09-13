"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Brand tabs — Radix tabs with a forged-gold pill that physically slides
 * between items (framer-motion layoutId spring). Content panels animate in
 * via the global `tab-content-in` keyframes (see globals.css).
 *
 * Usage:
 *   <BrandTabs items={[{ value, label, icon? }]} defaultValue="overview">
 *     <TabsContent value="overview">…</TabsContent>
 *   </BrandTabs>
 */
export interface BrandTabItem {
  value: string;
  label: string;
  icon?: React.ElementType;
  /** optional numeric chip (e.g. pending count) */
  badge?: number;
}

export function BrandTabs({
  items,
  value,
  defaultValue,
  onValueChange,
  children,
  className,
  listClassName,
  size = "md",
}: {
  items: BrandTabItem[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  /** optional TabsContent panels — omit when driving sections externally */
  children?: React.ReactNode;
  className?: string;
  listClassName?: string;
  size?: "sm" | "md";
}) {
  const layoutId = React.useId();
  const [internal, setInternal] = React.useState(
    defaultValue ?? value ?? items[0]?.value ?? ""
  );
  const current = value ?? internal;

  const handleChange = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };

  return (
    <TabsPrimitive.Root
      value={current}
      onValueChange={handleChange}
      className={cn("flex flex-col gap-2", className)}
    >
      <TabsPrimitive.List
        className={cn(
          "no-scrollbar relative flex w-full items-center justify-start gap-1 overflow-x-auto rounded-xl border border-[#262626] bg-[#101010] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.04)]",
          listClassName
        )}
      >
        {items.map((item) => {
          const active = current === item.value;
          const Icon = item.icon;
          return (
            <TabsPrimitive.Trigger
              key={item.value}
              value={item.value}
              className={cn(
                "relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-bold outline-none transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-primary/35",
                size === "md" ? "h-9 px-3.5 text-[12px]" : "h-8 px-3 text-[11px]",
                active
                  ? "text-[#3A2D00]"
                  : "text-neutral-500 hover:bg-white/[.03] hover:text-neutral-200"
              )}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-lg bg-[linear-gradient(180deg,#FFE066_0%,#F5C400_50%,#DBA900_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,.42),inset_0_-2px_0_rgba(138,101,0,.5),0_1px_3px_rgba(0,0,0,.4),0_0_10px_rgba(245,196,0,.14)]"
                  transition={{ type: "spring", stiffness: 480, damping: 40, mass: 0.9 }}
                />
              )}
              {Icon && <Icon className="h-4 w-4" />}
              <span>{item.label}</span>
              {item.badge != null && item.badge > 0 && (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black tabular-nums",
                    active ? "bg-black/25 text-[#3A2D00]" : "bg-primary/15 text-primary"
                  )}
                >
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
      {children}
    </TabsPrimitive.Root>
  );
}

/** re-export so consumers only need one import site */
export const BrandTabContent = TabsPrimitive.Content;
