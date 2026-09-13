"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Users2, Clock, Check, X, CalendarDays, Loader2, Zap } from "lucide-react";
import { useI18n } from "@/i18n";
import { PageHeader, EmptyState } from "./ui";
import { bookClassAction, cancelBookingAction } from "@/server-actions/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClassItem {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  date: string;
  durationMin: number;
  capacity: number;
  booked: number;
  instructor: string | null;
  isBooked: boolean;
  myBookingId: string | null;
}

const CLASS_ICONS: Record<string, string> = {
  HIIT: "🔥",
  BOX: "🥊",
  YOGA: "🧘",
  CROSS: "⚡",
  CARDIO: "🏃",
  STRETCH: "🤸",
};

export function ClassesClient({ classes }: { classes: ClassItem[] }) {
  const { t, pick, fmtDate, fmtTime, locale } = useI18n();
  const [items, setItems] = useState(classes);
  const [busy, setBusy] = useState<string | null>(null);

  const book = async (c: ClassItem) => {
    setBusy(c.id);
    const res = await bookClassAction(c.id);
    if (res.ok) {
      setItems((prev) =>
        prev.map((x) =>
          x.id === c.id
            ? { ...x, isBooked: true, booked: x.booked + 1, myBookingId: "pending" }
            : x
        )
      );
      toast.success(t("classes.bookingConfirmed"));
      setTimeout(() => window.location.reload(), 700);
    } else {
      toast.error(t(res.error as never));
    }
    setBusy(null);
  };

  const cancel = async (c: ClassItem) => {
    if (!c.myBookingId || c.myBookingId === "pending") return;
    setBusy(c.id);
    const res = await cancelBookingAction(c.myBookingId);
    if (res.ok) {
      toast.success(t("classes.bookingCancelled"));
      setTimeout(() => window.location.reload(), 700);
    } else {
      toast.error(t(res.error as never));
    }
    setBusy(null);
  };

  // group by day
  const grouped: { day: string; items: ClassItem[] }[] = [];
  const dayFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  for (const c of items) {
    const key = dayFmt.format(new Date(c.date));
    const g = grouped.find((g) => g.day === key);
    if (g) g.items.push(c);
    else grouped.push({ day: key, items: [c] });
  }

  return (
    <div>
      <PageHeader title={t("classes.title")} />

      {items.length === 0 ? (
        <EmptyState icon={Users2} title={t("classes.noClasses")} desc={t("classes.noClassesDesc")} />
      ) : (
        <div className="space-y-6">
          {grouped.map((g) => (
            <section key={g.day}>
              <div className="mb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary/70" />
                <h2 className="text-[12px] font-black tracking-wide text-neutral-400 uppercase">
                  {g.day}
                </h2>
              </div>
              <div className="space-y-3">
                {g.items.map((c, i) => {
                  const full = c.booked >= c.capacity;
                  const spots = Math.max(0, c.capacity - c.booked);
                  const icon = Object.keys(CLASS_ICONS).find((k) =>
                    `${c.nameEn}${c.nameEn}${c.nameAr}`.toUpperCase().includes(k)
                  );
                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.28 }}
                      className={cn(
                        "surface-card card-sheen rounded-2xl p-4",
                        c.isBooked && "border-primary/30"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#151515] text-xl">
                            {icon ? CLASS_ICONS[icon] : <Zap className="h-5 w-5 text-primary" />}
                          </span>
                          <div>
                            <p className="font-display text-[15px] font-black text-neutral-50">
                              {pick({ nameAr: c.nameAr, nameFr: c.nameFr, nameEn: c.nameEn })}
                            </p>
                            <div className="mt-1 flex items-center gap-2.5 text-[11px] text-neutral-500">
                              <span className="flex items-center gap-1 tabular-nums">
                                <Clock className="h-3 w-3" />
                                {fmtTime(c.date)} · {c.durationMin}
                                {t("common.minutes")}
                              </span>
                              {c.instructor && <span>· {c.instructor}</span>}
                            </div>
                          </div>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-md px-2 py-1 text-[10px] font-bold tabular-nums",
                            full
                              ? "bg-danger/10 text-danger"
                              : spots <= 3
                                ? "bg-warning/10 text-warning"
                                : "bg-[#151515] text-neutral-400"
                          )}
                        >
                          {full
                            ? t("classes.full")
                            : t("classes.availableSpots", { n: spots })}
                        </span>
                      </div>

                      {/* capacity bar */}
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/60">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8A6500] to-[#F5C400]"
                          style={{ width: `${Math.min(100, (c.booked / c.capacity) * 100)}%` }}
                        />
                      </div>
                      <p className="mt-1.5 text-[10px] text-neutral-600 tabular-nums">
                        {c.booked} {t("classes.spots", { n: c.capacity })}
                      </p>

                      {/* action */}
                      <div className="mt-3.5">
                        {c.isBooked ? (
                          <div className="flex gap-2">
                            <span className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 text-[12px] font-extrabold tracking-wide text-primary">
                              <Check className="h-4 w-4" />
                              {t("classes.booked")}
                            </span>
                            <button
                              onClick={() => cancel(c)}
                              disabled={busy === c.id}
                              aria-label={t("classes.cancelBooking")}
                              className="flex h-10 w-11 items-center justify-center rounded-lg border border-neutral-800 text-neutral-500 transition-colors hover:border-danger/40 hover:text-danger"
                            >
                              {busy === c.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        ) : full ? (
                          <button
                            disabled
                            className="flex h-10 w-full items-center justify-center rounded-lg bg-[#151515] text-[12px] font-bold text-neutral-600"
                          >
                            {t("classes.full")}
                          </button>
                        ) : (
                          <button
                            onClick={() => book(c)}
                            disabled={busy === c.id}
                            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-primary text-[12px] font-extrabold tracking-wide text-black transition-all hover:bg-[#ffd700] active:scale-[0.98] disabled:opacity-60"
                          >
                            {busy === c.id && <Loader2 className="h-4 w-4 animate-spin" />}
                            {t("classes.bookNow")}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
