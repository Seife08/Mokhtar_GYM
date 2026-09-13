"use client";

import Link from "next/link";
import { CalendarCheck, Users2, XCircle } from "lucide-react";
import { useI18n } from "@/i18n";
import { StatusBadge } from "@/components/brand/status-badge";
import { EmptyState } from "@/components/client/ui";
import { BrandTabs, BrandTabContent } from "@/components/brand/tabs";

interface BItem {
  id: string;
  memberId: string;
  memberName: string;
  classNameAr: string;
  classNameFr: string;
  classNameEn: string;
  date: string;
  status: string;
  bookedAt: string;
}

export function BookingsAdminClient({
  upcoming,
  history,
}: {
  upcoming: BItem[];
  history: BItem[];
}) {
  const { t, pick, fmtDate, fmtTime } = useI18n();

  return (
    <div className="space-y-4">
      <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
        {t("admin.bookings")}
      </h1>

      <BrandTabs
        defaultValue="upcoming"
        className="w-full"
        items={[
          { value: "upcoming", label: t("admin.upcoming"), badge: upcoming.length },
          { value: "history", label: `${t("admin.past")} / ${t("admin.cancelled")}`, badge: history.length },
        ]}
      >

        <BrandTabContent value="upcoming" className="mt-4">
          {upcoming.length === 0 ? (
            <EmptyState icon={Users2} title={t("classes.noBookings")} />
          ) : (
            <div className="surface-card divide-y divide-[#161616] rounded-2xl">
              {upcoming.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <Link
                      href={`/admin/members/${b.memberId}`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[12px] font-black text-primary"
                    >
                      {b.memberName.charAt(0)}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/admin/members/${b.memberId}`} className="text-[13.5px] font-bold text-neutral-100 hover:text-primary">
                        {b.memberName}
                      </Link>
                      <p className="truncate text-[11.5px] text-neutral-500">
                        {pick({ nameAr: b.classNameAr, nameFr: b.classNameFr, nameEn: b.classNameEn })} ·{" "}
                        {fmtDate(b.date, { weekday: "short", day: "numeric", month: "short" })} {fmtTime(b.date)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge tone="booked" />
                </div>
              ))}
            </div>
          )}
        </BrandTabContent>

        <BrandTabContent value="history" className="mt-4">
          {history.length === 0 ? (
            <EmptyState icon={CalendarCheck} title={t("classes.noBookings")} />
          ) : (
            <div className="surface-card divide-y divide-[#161616] rounded-2xl">
              {history.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-bold text-neutral-100">{b.memberName}</p>
                    <p className="truncate text-[11.5px] text-neutral-500">
                      {pick({ nameAr: b.classNameAr, nameFr: b.classNameFr, nameEn: b.classNameEn })} · {fmtDate(b.date)}
                    </p>
                  </div>
                  <StatusBadge tone={b.status === "CANCELLED" ? "cancelled" : "completed"} />
                </div>
              ))}
            </div>
          )}
        </BrandTabContent>
      </BrandTabs>
    </div>
  );
}
