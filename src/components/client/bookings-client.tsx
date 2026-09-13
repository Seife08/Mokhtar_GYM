"use client";

import { useState } from "react";
import { CalendarCheck, Clock, X, Loader2, Users2 } from "lucide-react";
import { useI18n } from "@/i18n";
import { PageHeader, EmptyState } from "./ui";
import { cancelBookingAction } from "@/server-actions/client";
import { toast } from "sonner";
import { StatusBadge } from "@/components/brand/status-badge";

interface BItem {
  id: string;
  nameEn: string;
  nameAr: string;
  nameFr: string;
  date: string;
  durationMin: number;
  instructor: string | null;
  status: string;
}

export function BookingsClient({ bookings }: { bookings: BItem[] }) {
  const { t, pick, fmtDate, fmtTime } = useI18n();
  const [busy, setBusy] = useState<string | null>(null);

  const cancel = async (id: string) => {
    setBusy(id);
    const res = await cancelBookingAction(id);
    if (res.ok) {
      toast.success(t("classes.bookingCancelled"));
      setTimeout(() => window.location.reload(), 600);
    } else {
      toast.error(t(res.error as never));
    }
    setBusy(null);
  };

  return (
    <div>
      <PageHeader title={t("classes.myBookings")} />

      {bookings.length === 0 ? (
        <EmptyState
          icon={Users2}
          title={t("classes.noBookings")}
          desc={t("classes.noBookingsDesc")}
        />
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={b.id} className="surface-card card-sheen rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-[16px] font-black text-neutral-50">
                    {pick({ nameAr: b.nameAr, nameFr: b.nameFr, nameEn: b.nameEn })}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11.5px] text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5" />
                      {fmtDate(b.date, { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    <span className="flex items-center gap-1.5 tabular-nums">
                      <Clock className="h-3.5 w-3.5" />
                      {fmtTime(b.date)}
                    </span>
                  </div>
                  {b.instructor && (
                    <p className="mt-1 text-[11px] text-neutral-600">
                      {t("classes.instructor")}: {b.instructor}
                    </p>
                  )}
                </div>
                <StatusBadge tone={b.status === "CANCELLED" ? "cancelled" : "booked"} />
              </div>
              <div className="mt-3.5 flex gap-2">
                <button
                  onClick={() => cancel(b.id)}
                  disabled={busy === b.id}
                  className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 text-[12px] font-bold text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                >
                  {busy === b.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  {t("classes.cancelBooking")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
