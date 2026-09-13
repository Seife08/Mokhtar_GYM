"use client";

import * as React from "react";
import { Clock, Dumbbell, Sparkles } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { BrandTabs } from "@/components/brand/tabs";
import { cn } from "@/lib/utils";

/* ================= types ================= */
interface Slot {
  startMin: number;
  endMin: number;
  label: string | null;
}
interface ScheduleDay {
  gender: "MALE" | "FEMALE";
  dayOfWeek: number;
  isOpen: boolean;
  note: string | null;
  slots: Slot[];
}

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const DAY_KEY: Record<number, DictKey> = {
  1: "admin.dayMonday",
  2: "admin.dayTuesday",
  3: "admin.dayWednesday",
  4: "admin.dayThursday",
  5: "admin.dayFriday",
  6: "admin.daySaturday",
  7: "admin.daySunday",
};

const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const currentISODay = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};

/** ISO day → locale-aware first-of-week ordering */
const dayOrder = (day: number, weekStartsMonday: boolean) => {
  if (weekStartsMonday) return day; // 1..7 already Monday-first
  return day === 7 ? 0 : day; // Sunday-first: convert ISO to 0..6
};

/* ================= open-now engine ================= */
type Status =
  | { state: "open"; closesAt: number }
  | { state: "opens-later"; today: Slot | null; nextDay: number | null; at: number }
  | { state: "closed-all-day" }
  | { state: "no-schedule" };

function computeStatus(days: ScheduleDay[]): Status {
  const map = new Map<number, ScheduleDay>();
  for (const d of days) map.set(d.dayOfWeek, d);
  if (days.length === 0) return { state: "no-schedule" };

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = map.get(currentISODay());

  if (today && today.isOpen) {
    const sorted = [...today.slots].sort((a, b) => a.startMin - b.startMin);
    // currently inside a slot?
    const active = sorted.find((s) => nowMin >= s.startMin && nowMin < s.endMin);
    if (active) return { state: "open", closesAt: active.endMin };

    // still a slot later today?
    const next = sorted.find((s) => s.startMin > nowMin);
    if (next) return { state: "opens-later", today: next, nextDay: null, at: next.startMin };
  }

  // scan the next 7 days for the next opening
  for (let i = 1; i <= 7; i++) {
    const d = map.get(((currentISODay() - 1 + i) % 7) + 1);
    if (d && d.isOpen && d.slots.length > 0) {
      const first = [...d.slots].sort((a, b) => a.startMin - b.startMin)[0];
      return { state: "opens-later", today: null, nextDay: d.dayOfWeek, at: first.startMin };
    }
  }
  return { state: "closed-all-day" };
}

/* ================= main ================= */
export function HoursSection({ schedules }: { schedules: ScheduleDay[] }) {
  const { t, locale } = useI18n();
  const [section, setSection] = React.useState<"MALE" | "FEMALE">("MALE");

  // recompute the live status every minute
  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const days = schedules.filter((s) => s.gender === section);
  const status = computeStatus(days);
  const today = currentISODay();

  if (schedules.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-[13px] font-black tracking-wide text-neutral-300">
          <Clock className="h-4 w-4 text-primary" />
          {t("hours.title")}
        </h3>
        <LiveBadge status={status} />
      </div>

      <BrandTabs
        value={section}
        onValueChange={(v) => setSection(v as "MALE" | "FEMALE")}
        items={[
          { value: "MALE", label: t("hours.men"), icon: Dumbbell },
          { value: "FEMALE", label: t("hours.women"), icon: Sparkles },
        ]}
        size="sm"
        className="w-full"
        listClassName="w-full grid grid-cols-2 justify-stretch"
      />

      {/* today highlighted */}
      {(() => {
        const td = days.find((d) => d.dayOfWeek === today);
        if (!td) return null;
        return (
          <div className="mt-3 rounded-2xl border border-primary/25 bg-[linear-gradient(160deg,#191510,#0e0c07)] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold text-neutral-300">
                {t("hours.today")} — {t(DAY_KEY[today])}
              </p>
              {td.isOpen && td.slots.length > 0 ? (
                <span className="flex items-center gap-1.5 text-[11px] font-black text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                  </span>
                  {status.state === "open"
                    ? t("hours.openNow")
                    : status.state === "opens-later"
                      ? t("hours.opensAt", { time: minToHHMM(status.at) })
                      : t("hours.closedNow")}
                </span>
              ) : (
                <span className="text-[11px] font-bold text-neutral-500">{t("hours.closed")}</span>
              )}
            </div>
            {td.isOpen && td.slots.length > 0 && (
              <TodayTimeline slots={td.slots} note={td.note} />
            )}
          </div>
        );
      })()}

      {/* full week */}
      <div className="mt-3 space-y-1.5">
        {DAYS.map((d) => {
          const day = days.find((x) => x.dayOfWeek === d);
          const isToday = d === today;
          const open = day?.isOpen && day.slots.length > 0;
          return (
            <div
              key={d}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition-colors",
                isToday
                  ? "border-primary/30 bg-primary/[.05]"
                  : "border-[#1E1E1E] bg-[#121212]"
              )}
            >
              <span
                className={cn(
                  "text-[12.5px] font-bold",
                  isToday ? "text-primary" : "text-neutral-300"
                )}
              >
                {t(DAY_KEY[d])}
              </span>
              <span className="flex items-center gap-2" dir="ltr">
                {open ? (
                  day.slots
                    .slice()
                    .sort((a, b) => a.startMin - b.startMin)
                    .map((s, i) => (
                      <span
                        key={i}
                        className="rounded-md border border-primary/20 bg-primary/[.07] px-2 py-0.5 text-[11px] font-bold tabular-nums text-primary/95"
                      >
                        {minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}
                      </span>
                    ))
                ) : (
                  <span className="text-[11px] font-semibold text-neutral-600">
                    {day ? t("hours.closed") : "—"}
                  </span>
                )}
              </span>
            </div>
          );
        })}
        {days.length === 0 && (
          <p className="py-4 text-center text-[12px] text-neutral-600">{t("hours.noSchedule")}</p>
        )}
      </div>

      {(() => {
        const td = days.find((d) => d.dayOfWeek === today);
        return td?.note ? (
          <p className="mt-2.5 rounded-xl border border-[#262626] bg-[#141414] px-3.5 py-2 text-[11.5px] text-neutral-400">
            {td.note}
          </p>
        ) : null;
      })()}
    </section>
  );
}

/* ================= live badge ================= */
function LiveBadge({ status }: { status: Status }) {
  const { t } = useI18n();

  if (status.state === "open") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-success/50 bg-success/10 px-2.5 py-1 text-[10px] font-black text-success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        {t("hours.openNow")}
      </span>
    );
  }
  if (status.state === "opens-later") {
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-primary/35 bg-primary/[.07] px-2.5 py-1 text-[10px] font-black text-primary">
        <Clock className="h-3 w-3" />
        {t("hours.opensAt", { time: minToHHMM(status.at) })}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/40 px-2.5 py-1 text-[10px] font-black text-neutral-400">
      {t("hours.closedNow")}
    </span>
  );
}

/* ================= 24h timeline with now marker ================= */
function TodayTimeline({ slots, note }: { slots: Slot[]; note: string | null }) {
  const { t } = useI18n();
  const [nowMin, setNowMin] = React.useState<number | null>(null);

  React.useEffect(() => {
    const upd = () => setNowMin(new Date().getHours() * 60 + new Date().getMinutes());
    upd();
    const id = setInterval(upd, 30_000);
    return () => clearInterval(id);
  }, []);

  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin);

  return (
    <div className="mt-3">
      {/* slot chips */}
      <div className="flex flex-wrap gap-2" dir="ltr">
        {sorted.map((s, i) => {
          const live = nowMin !== null && nowMin >= s.startMin && nowMin < s.endMin;
          return (
            <span
              key={i}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-[11.5px] font-black tabular-nums transition-colors",
                live
                  ? "border-success/60 bg-success/15 text-success"
                  : "border-primary/25 bg-primary/[.07] text-primary/95"
              )}
            >
              {s.label ? `${s.label} · ` : ""}
              {minToHHMM(s.startMin)}–{minToHHMM(s.endMin)}
              {live && " ●"}
            </span>
          );
        })}
      </div>

      {/* 24h rail */}
      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-[#1C1C1C]" dir="ltr">
        {sorted.map((s, i) => {
          const live = nowMin !== null && nowMin >= s.startMin && nowMin < s.endMin;
          return (
            <div
              key={i}
              className={cn(
                "absolute inset-y-0 rounded-[4px]",
                live
                  ? "bg-[linear-gradient(180deg,#7BE495,#3FA45B)] shadow-[0_0_10px_rgba(80,200,120,.4)]"
                  : "bg-[linear-gradient(180deg,#FFE066,#D9A800)]"
              )}
              style={{
                left: `${(s.startMin / 1440) * 100}%`,
                width: `${((s.endMin - s.startMin) / 1440) * 100}%`,
              }}
            />
          );
        })}
        {/* hour ticks */}
        {[0, 6, 12, 18, 24].map((h) => (
          <div
            key={h}
            className="absolute inset-y-0 w-px bg-white/[.07]"
            style={{ left: `${(h / 24) * 100}%` }}
          />
        ))}
        {nowMin !== null && (
          <div
            className="absolute inset-y-0 w-[2px] rounded bg-white shadow-[0_0_6px_rgba(255,255,255,.8)]"
            style={{ left: `${(nowMin / 1440) * 100}%` }}
          >
            <span className="absolute -top-0.5 start-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white" />
          </div>
        )}
      </div>
      <div className="mt-1 flex justify-between text-[9px] font-bold text-neutral-600" dir="ltr">
        <span>00</span>
        <span>06</span>
        <span>12</span>
        <span>18</span>
        <span>24</span>
      </div>
      {note && (
        <p className="mt-2 text-[11px] text-neutral-500">{note}</p>
      )}
    </div>
  );
}
