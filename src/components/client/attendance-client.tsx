"use client";

import { CalendarCheck, Flame, CheckCircle2, QrCode, MapPin, TrendingUp } from "lucide-react";
import { useI18n } from "@/i18n";
import { PageHeader, EmptyState, StatTile, SectionTitle } from "./ui";
import { cn } from "@/lib/utils";

interface RItem {
  id: string;
  checkInAt: string;
  checkOutAt: string | null;
  method: string;
}

/** 12-week activity heatmap */
function Heatmap({ visitDays }: { visitDays: string[] }) {
  const set = new Set(visitDays);
  const weeks: Date[][] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // start from 11 weeks ago Sunday
  const start = new Date(today);
  start.setDate(start.getDate() - 77 - today.getDay());
  for (let w = 0; w < 12; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + w * 7 + d);
      week.push(day);
    }
    weeks.push(week);
  }
  const tooltipFmt = (d: Date) => d.toISOString().slice(0, 10);
  return (
    <div className="flex gap-[3px] overflow-x-auto no-scrollbar" dir="ltr">
      {weeks.map((week, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {week.map((day) => {
            const visited = set.has(day.toDateString());
            const future = day > new Date();
            const level = visited ? 1 : 0;
            return (
              <div
                key={day.toISOString()}
                title={tooltipFmt(day)}
                className={cn(
                  "h-[11px] w-[11px] rounded-[3px]",
                  future
                    ? "bg-transparent"
                    : level === 1
                      ? "bg-primary shadow-[0_0_6px_rgba(245,196,0,0.3)]"
                      : "bg-[#161616]"
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AttendanceClient({
  records,
  visitsThisMonth,
  streak,
  visitDays,
  totalVisits,
}: {
  records: RItem[];
  visitsThisMonth: number;
  streak: number;
  visitDays: string[];
  totalVisits: number;
}) {
  const { t, fmtDate, fmtTime } = useI18n();

  // group by date
  const grouped: { day: string; items: RItem[] }[] = [];
  for (const r of records) {
    const key = new Date(r.checkInAt).toDateString();
    const g = grouped.find((g) => g.day === key);
    if (g) g.items.push(r);
    else grouped.push({ day: key, items: [r] });
  }

  return (
    <div>
      <PageHeader title={t("nav.attendance")} />

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t("home.visitsThisMonth")} value={visitsThisMonth} icon={CalendarCheck} accent="gold" />
        <StatTile label={t("home.currentStreak")} value={streak} sub={t("common.days")} icon={Flame} accent="warning" />
        <StatTile label={t("admin.totalVisits")} value={totalVisits} icon={TrendingUp} />
      </div>

      {/* heatmap */}
      <section className="mt-6">
        <SectionTitle>{t("nav.attendance")}</SectionTitle>
        <div className="surface-card rounded-2xl p-4">
          <Heatmap visitDays={visitDays} />
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-neutral-600">
            <span>{t("common.none")}</span>
            <span className="h-[10px] w-[10px] rounded-[3px] bg-[#161616]" />
            <span className="h-[10px] w-[10px] rounded-[3px] bg-primary/40" />
            <span className="h-[10px] w-[10px] rounded-[3px] bg-primary" />
          </div>
        </div>
      </section>

      {/* history */}
      <section className="mt-6">
        <SectionTitle>{t("admin.attendanceHistory")}</SectionTitle>
        {records.length === 0 ? (
          <EmptyState icon={CalendarCheck} title={t("notifs.none")} />
        ) : (
          <div className="space-y-2">
            {grouped.slice(0, 30).map((g) => (
              <div key={g.day} className="surface-card rounded-xl p-3.5">
                <p className="text-[12px] font-bold text-neutral-300">
                  {fmtDate(g.items[0].checkInAt, {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
                <div className="mt-2 space-y-1.5">
                  {g.items.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-[11.5px]">
                      <span className="flex items-center gap-2 text-neutral-400 tabular-nums">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        {fmtTime(r.checkInAt)}
                        {r.checkOutAt && (
                          <span className="text-neutral-600">→ {fmtTime(r.checkOutAt)}</span>
                        )}
                      </span>
                      <span className="rounded bg-[#151515] px-1.5 py-0.5 text-[9px] font-bold text-neutral-500">
                        {r.method === "QR" ? "QR" : t("admin.manualCheckin")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
