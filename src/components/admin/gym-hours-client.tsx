"use client";

import * as React from "react";
import {
  Dumbbell,
  Sparkles,
  Sunrise,
  MoonStar,
  ChevronRight,
  Pencil,
  Check,
  Copy,
  Clock,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { useI18n, type DictKey } from "@/i18n";
import { saveScheduleAction, copyDayAction } from "@/server-actions/admin-gym";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/* ================= types ================= */
interface Slot {
  startMin: number;
  endMin: number;
  label: string | null;
}
interface SerializedSchedule {
  gender: "MALE" | "FEMALE";
  dayOfWeek: number;
  isOpen: boolean;
  note: string | null;
  slots: Slot[];
}

/** one editable session: morning or evening */
interface Period {
  enabled: boolean;
  startMin: number;
  endMin: number;
}
interface DayState {
  isOpen: boolean;
  note: string;
  morning: Period;
  evening: Period;
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
const DAY_SHORT_KEY: Record<number, DictKey> = {
  1: "hours.dayShort1",
  2: "hours.dayShort2",
  3: "hours.dayShort3",
  4: "hours.dayShort4",
  5: "hours.dayShort5",
  6: "hours.dayShort6",
  7: "hours.dayShort7",
};

/* default periods — match a classic Algerian gym split */
const DEF_MORNING = { enabled: true, startMin: 360, endMin: 720 }; // 06:00–12:00
const DEF_EVENING = { enabled: true, startMin: 960, endMin: 1380 }; // 16:00–23:00

/* minutes <-> "HH:MM" */
const minToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const hhmmToMin = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fmtHours = (m: number) => {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm === 0 ? `${h}h` : `${h}h${String(mm).padStart(2, "0")}`;
};

const currentISODay = () => {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
};
const nowMinutes = () => new Date().getHours() * 60 + new Date().getMinutes();

/* slot list → the two-period view (morning starts before 14:00) */
function fromSlots(slots: Slot[]): { morning: Period; evening: Period } {
  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin);
  const m = sorted.find((s) => s.startMin < 840);
  const e = sorted.find((s) => s.startMin >= 840);
  return {
    morning: m
      ? { enabled: true, startMin: m.startMin, endMin: m.endMin }
      : { ...DEF_MORNING, enabled: false },
    evening: e
      ? { enabled: true, startMin: e.startMin, endMin: e.endMin }
      : { ...DEF_EVENING, enabled: false },
  };
}

type Gender = "MALE" | "FEMALE";
type View =
  | { level: "sections" }
  | { level: "days"; gender: Gender }
  | { level: "day"; gender: Gender; day: number };

/* ================= main ================= */
export function GymHoursClient({ initial }: { initial: SerializedSchedule[] }) {
  const { t } = useI18n();
  const [view, setView] = React.useState<View>({ level: "sections" });

  // two independent weekly schedules, hydrated once from the server
  const [weeks, setWeeks] = React.useState<Record<Gender, Record<number, DayState>>>(() => {
    const base = (g: Gender) => {
      const map: Record<number, DayState> = {};
      for (const d of DAYS)
        map[d] = {
          isOpen: false,
          note: "",
          morning: { ...DEF_MORNING, enabled: false },
          evening: { ...DEF_EVENING, enabled: false },
        };
      for (const s of initial.filter((x) => x.gender === g)) {
        const { morning, evening } = fromSlots(s.slots);
        map[s.dayOfWeek] = {
          isOpen: s.isOpen && (morning.enabled || evening.enabled),
          note: s.note ?? "",
          morning,
          evening,
        };
      }
      return map;
    };
    return { MALE: base("MALE"), FEMALE: base("FEMALE") };
  });

  /* ---- auto-save engine: sequential chain, latest state wins ---- */
  const chain = React.useRef<Promise<void>>(Promise.resolve());
  const [saveFlash, setSaveFlash] = React.useState<"idle" | "saving" | "saved">("idle");
  const flashTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (s: "saving" | "saved") => {
    setSaveFlash(s);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    if (s === "saved") {
      flashTimer.current = setTimeout(() => setSaveFlash("idle"), 2200);
    }
  };

  const persist = React.useCallback(
    (gender: Gender, day: number, next: DayState) => {
      flash("saving");
      chain.current = chain.current
        .then(() =>
          // server actions invoked outside <form action={...}> must run
          // inside a transition — otherwise React logs the useActionState
          // warning and pending states won't settle correctly
          React.startTransition(async () => {
            // a day with no enabled periods is stored as closed
            const open = next.isOpen && (next.morning.enabled || next.evening.enabled);
            const slots: Slot[] = [];
            if (next.morning.enabled)
              slots.push({ startMin: next.morning.startMin, endMin: next.morning.endMin, label: null });
            if (next.evening.enabled)
              slots.push({ startMin: next.evening.startMin, endMin: next.evening.endMin, label: null });

            const fd = new FormData();
            fd.set("gender", gender);
            fd.set("dayOfWeek", String(day));
            fd.set("isOpen", String(open));
            fd.set("note", next.note);
            fd.set("slots", JSON.stringify(slots));
            const res = await saveScheduleAction(null, fd);
            if (!res.ok) {
              toast.error(t(res.error as never));
            } else {
              flash("saved");
              toast.success(t("admin.daySaved"), { duration: 2000 });
            }
          })
        )
        .catch(() => {
          toast.error(t("validation.serverError"));
        });
    },
    [t]
  );

  const updateDay = (
    gender: Gender,
    day: number,
    patch: Partial<DayState>,
    opts?: { persist?: boolean }
  ) => {
    let next: DayState | null = null;
    setWeeks((w) => {
      const cur = w[gender][day];
      const merged: DayState = { ...cur, ...patch };
      next = merged;
      return { ...w, [gender]: { ...w[gender], [day]: merged } };
    });
    // setWeeks updater runs synchronously in React 18/19 event handlers
    if (next && opts?.persist !== false) persist(gender, day, next);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
          {t("admin.gymHours")}
        </h1>
        <p className="mt-1 text-[13px] text-neutral-500">{t("admin.gymHoursDesc")}</p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold transition-colors",
              saveFlash === "saving"
                ? "border-primary/40 bg-primary/10 text-primary"
                : saveFlash === "saved"
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-[#262626] bg-[#131313] text-neutral-500"
            )}
          >
            {saveFlash === "saving" ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                {t("hours.saving")}
              </>
            ) : saveFlash === "saved" ? (
              <>
                <Check className="h-3 w-3" />
                {t("hours.autoSaved")}
              </>
            ) : (
              <>
                <Clock className="h-3 w-3" />
                {t("hours.autoSaveHint")}
              </>
            )}
          </span>
        </div>
      </div>

      {/* level transitions — same restrained fade+rise as the app routes */}
      {view.level === "sections" && (
        <div key="sections" className="animate-fade-up">
          <SectionChoice
            weeks={weeks}
            onPick={(g) => setView({ level: "days", gender: g })}
          />
        </div>
      )}

      {view.level === "days" && (
        <div key={`days-${view.gender}`} className="animate-fade-up">
          <DaysList
            gender={view.gender}
            week={weeks[view.gender]}
            onBack={() => setView({ level: "sections" })}
            onPick={(day) => setView({ level: "day", gender: view.gender, day })}
          />
        </div>
      )}

      {view.level === "day" && (
        <div key={`day-${view.gender}-${view.day}`} className="animate-fade-up">
          <DayEditor
            gender={view.gender}
            day={view.day}
            data={weeks[view.gender][view.day]}
            onBack={() => setView({ level: "days", gender: view.gender })}
            onChange={(patch, opts) => updateDay(view.gender, view.day, patch, opts)}
            onPeriodsChange={(morning, evening) => {
              // day auto-closes when both periods are off
              const cur = weeks[view.gender][view.day];
              const isOpen =
                (morning?.enabled ?? cur.morning.enabled) ||
                (evening?.enabled ?? cur.evening.enabled);
              updateDay(view.gender, view.day, {
                ...(morning !== undefined ? { morning } : {}),
                ...(evening !== undefined ? { evening } : {}),
                isOpen,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ================= level 0 — section choice ================= */
function SectionChoice({
  weeks,
  onPick,
}: {
  weeks: Record<Gender, Record<number, DayState>>;
  onPick: (g: Gender) => void;
}) {
  const { t } = useI18n();
  const today = currentISODay();
  const nowMin = nowMinutes();

  const stats = (g: Gender) => {
    const week = weeks[g];
    let total = 0;
    for (const d of DAYS) {
      if (week[d].isOpen)
        total +=
          (week[d].morning.enabled ? week[d].morning.endMin - week[d].morning.startMin : 0) +
          (week[d].evening.enabled ? week[d].evening.endMin - week[d].evening.startMin : 0);
    }
    const td = week[today];
    const openNow =
      td.isOpen &&
      ((td.morning.enabled && nowMin >= td.morning.startMin && nowMin < td.morning.endMin) ||
        (td.evening.enabled && nowMin >= td.evening.startMin && nowMin < td.evening.endMin));
    const todayChips: string[] = [];
    if (td.isOpen) {
      if (td.morning.enabled)
        todayChips.push(`${minToHHMM(td.morning.startMin)}–${minToHHMM(td.morning.endMin)}`);
      if (td.evening.enabled)
        todayChips.push(`${minToHHMM(td.evening.startMin)}–${minToHHMM(td.evening.endMin)}`);
    }
    return { total, openNow, todayChips };
  };

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-neutral-500">{t("hours.chooseSectionHint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(["MALE", "FEMALE"] as const).map((g, i) => {
          const s = stats(g);
          const Icon = g === "MALE" ? Dumbbell : Sparkles;
          return (
            <button
              key={g}
              type="button"
              onClick={() => onPick(g)}
              className="cmd-tile group min-h-[168px] text-start"
            >
              {/* engraved index */}
              <span
                aria-hidden
                className="pointer-events-none absolute end-3 top-2.5 font-display text-[34px] font-black leading-none text-white/[.055] transition-colors group-hover:text-primary/20"
              >
                0{i + 1}
              </span>
              <span className="cmd-bracket" aria-hidden />

              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl border transition-colors",
                    "border-primary/25 bg-primary/10"
                  )}
                >
                  <Icon className="h-5.5 w-5.5 text-primary" strokeWidth={1.9} />
                </span>
                <span className="flex flex-col">
                  <span className="font-display text-[17px] font-black tracking-wide text-neutral-100">
                    {t(g === "MALE" ? "hours.menSection" : "hours.womenSection")}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        s.openNow
                          ? "bg-success shadow-[0_0_6px_rgba(80,200,120,.8)]"
                          : "bg-neutral-700"
                      )}
                    />
                    <span
                      className={cn(
                        "text-[11px] font-bold",
                        s.openNow ? "text-success" : "text-neutral-500"
                      )}
                    >
                      {s.openNow ? t("hours.openNow") : t("hours.closedNow")}
                    </span>
                    <span className="text-[11px] font-bold text-neutral-700">·</span>
                    <span className="text-[11px] font-bold tabular-nums text-neutral-500">
                      {t("hours.weekHours", { h: fmtHours(s.total) })}
                    </span>
                  </span>
                </span>
              </span>

              <span className="flex items-end justify-between gap-2">
                <span className="flex flex-wrap items-center gap-1.5" dir="ltr">
                  {s.todayChips.length > 0 ? (
                    s.todayChips.map((c) => (
                      <span
                        key={c}
                        className="rounded-md border border-primary/20 bg-primary/[.07] px-2 py-0.5 text-[10.5px] font-bold tabular-nums text-primary/95"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10.5px] font-semibold text-neutral-600">
                      {t("hours.today")} — {t("hours.closed")}
                    </span>
                  )}
                </span>
                <ChevronRight className="cmd-arrow h-4.5 w-4.5 shrink-0 text-neutral-600 rtl:rotate-180" />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= level 1 — days of the week ================= */
function DaysList({
  gender,
  week,
  onBack,
  onPick,
}: {
  gender: Gender;
  week: Record<number, DayState>;
  onBack: () => void;
  onPick: (day: number) => void;
}) {
  const { t } = useI18n();
  const today = currentISODay();
  const nowMin = nowMinutes();

  return (
    <div className="space-y-3">
      {/* breadcrumb */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-[#262626] bg-[#131313] px-3 text-[12px] font-bold text-neutral-400 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          {t("admin.gymHours")}
        </button>
        <ChevronRight aria-hidden className="h-3.5 w-3.5 text-neutral-700 rtl:rotate-180" />
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-neutral-200">
          {gender === "MALE" ? (
            <Dumbbell className="h-4 w-4 text-primary/80" />
          ) : (
            <Sparkles className="h-4 w-4 text-primary/80" />
          )}
          {t(gender === "MALE" ? "hours.menSection" : "hours.womenSection")}
        </span>
      </div>

      <div className="space-y-2">
        {DAYS.map((d) => {
          const data = week[d];
          const isToday = d === today;
          const chips: { label: string; live: boolean }[] = [];
          if (data.isOpen) {
            if (data.morning.enabled)
              chips.push({
                label: `${minToHHMM(data.morning.startMin)}–${minToHHMM(data.morning.endMin)}`,
                live:
                  nowMin >= data.morning.startMin &&
                  nowMin < data.morning.endMin,
              });
            if (data.evening.enabled)
              chips.push({
                label: `${minToHHMM(data.evening.startMin)}–${minToHHMM(data.evening.endMin)}`,
                live:
                  nowMin >= data.evening.startMin &&
                  nowMin < data.evening.endMin,
              });
          }
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPick(d)}
              className={cn(
                "group flex w-full items-center gap-4 rounded-xl border p-3.5 text-start transition-all duration-150 active:translate-y-px",
                isToday
                  ? "border-primary/35 bg-primary/[.05]"
                  : "border-[#1F1F1F] bg-[#111] hover:border-[#2E2A1A] hover:bg-white/[.02]"
              )}
            >
              {/* day name */}
              <span className="w-[92px] shrink-0">
                <span
                  className={cn(
                    "flex items-center gap-1.5 text-[13.5px] font-bold",
                    isToday ? "text-primary" : "text-neutral-200"
                  )}
                >
                  {t(DAY_KEY[d])}
                </span>
                {isToday && (
                  <span className="mt-0.5 block text-[9.5px] font-black tracking-wide text-primary/80">
                    {t("hours.today")}
                  </span>
                )}
              </span>

              {/* mini 24h rail + chips */}
              <span className="min-w-0 flex-1">
                <span className="relative block h-[6px] w-full overflow-hidden rounded-full bg-[#1B1B1B]" dir="ltr">
                  {data.isOpen && (
                    <>
                      {data.morning.enabled && (
                        <span
                          className="absolute inset-y-0 rounded-[2px] bg-[linear-gradient(180deg,#FFE066,#D9A800)]"
                          style={{
                            left: `${(data.morning.startMin / 1440) * 100}%`,
                            width: `${((data.morning.endMin - data.morning.startMin) / 1440) * 100}%`,
                          }}
                        />
                      )}
                      {data.evening.enabled && (
                        <span
                          className="absolute inset-y-0 rounded-[2px] bg-[linear-gradient(180deg,#FFE066,#D9A800)]"
                          style={{
                            left: `${(data.evening.startMin / 1440) * 100}%`,
                            width: `${((data.evening.endMin - data.evening.startMin) / 1440) * 100}%`,
                          }}
                        />
                      )}
                    </>
                  )}
                </span>
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5" dir="ltr">
                  {chips.length > 0 ? (
                    chips.map((c) => (
                      <span
                        key={c.label}
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums",
                          c.live
                            ? "border-success/50 bg-success/10 text-success"
                            : "border-primary/20 bg-primary/[.06] text-primary/90"
                        )}
                      >
                        {c.label}
                        {c.live && " ●"}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10.5px] font-semibold text-neutral-600">
                      {t("hours.closed")}
                    </span>
                  )}
                </span>
              </span>

              <ChevronRight className="h-4.5 w-4.5 shrink-0 text-neutral-700 transition-colors group-hover:text-primary rtl:rotate-180" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================= level 2 — day editor (periods) ================= */
function DayEditor({
  gender,
  day,
  data,
  onBack,
  onChange,
  onPeriodsChange,
}: {
  gender: Gender;
  day: number;
  data: DayState;
  onBack: () => void;
  onChange: (patch: Partial<DayState>, opts?: { persist?: boolean }) => void;
  onPeriodsChange: (morning?: Period, evening?: Period) => void;
}) {
  const { t } = useI18n();
  const [dialogPeriod, setDialogPeriod] = React.useState<"morning" | "evening" | null>(null);
  const [copyOpen, setCopyOpen] = React.useState(false);
  const [copyTargets, setCopyTargets] = React.useState<number[]>([]);
  const [copying, setCopying] = React.useState(false);

  const toggleDay = (open: boolean) => {
    if (open && !data.morning.enabled && !data.evening.enabled) {
      // opening a day with no periods → seed the classic split
      onChange({ isOpen: true, morning: { ...DEF_MORNING }, evening: { ...DEF_EVENING } });
    } else {
      onChange({ isOpen: open });
    }
  };

  const setPeriod = (which: "morning" | "evening", p: Period) => {
    onPeriodsChange(which === "morning" ? p : undefined, which === "evening" ? p : undefined);
  };

  const doCopy = () => {
    if (copyTargets.length === 0) return;
    setCopying(true);
    React.startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("gender", gender);
        fd.set("fromDay", String(day));
        fd.set("toDays", JSON.stringify(copyTargets));
        const res = await copyDayAction(null, fd);
        if (res.ok) {
          toast.success(t("admin.dayCopied"));
          setCopyOpen(false);
          setCopyTargets([]);
        } else {
          toast.error(t(res.error as never));
        }
      } catch {
        toast.error(t("validation.serverError"));
      } finally {
        setCopying(false);
      }
    });
  };

  const allSelected = copyTargets.length === DAYS.length - 1;

  return (
    <div className="space-y-3">
      {/* breadcrumb */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-[#262626] bg-[#131313] px-3 text-[12px] font-bold text-neutral-400 transition-colors hover:border-primary/40 hover:text-primary"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          {t(gender === "MALE" ? "hours.menSection" : "hours.womenSection")}
        </button>
        <ChevronRight aria-hidden className="h-3.5 w-3.5 text-neutral-700 rtl:rotate-180" />
        <span
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[13px] font-bold",
            day === currentISODay()
              ? "border-primary/35 bg-primary/10 text-primary"
              : "border-[#262626] bg-[#131313] text-neutral-200"
          )}
        >
          {day === currentISODay() && <Clock className="h-3.5 w-3.5" />}
          {t(DAY_KEY[day])}
        </span>
      </div>

      {/* day open toggle */}
      <div
        className={cn(
          "surface-card flex items-center justify-between rounded-2xl p-4 transition-colors",
          data.isOpen ? "" : "opacity-75"
        )}
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "relative flex h-2.5 w-2.5 rounded-full",
              data.isOpen ? "bg-success" : "bg-neutral-700"
            )}
          >
            {data.isOpen && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            )}
          </span>
          <div>
            <p className="text-[14px] font-bold text-neutral-100">
              {data.isOpen ? t("admin.openDay") : t("hours.closed")}
            </p>
            <p className="text-[11px] text-neutral-600">{t("hours.dayToggleHint")}</p>
          </div>
        </div>
        <Switch
          checked={data.isOpen}
          onCheckedChange={toggleDay}
          aria-label={t("admin.openDay")}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {/* period cards */}
      {data.isOpen ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["morning", "evening"] as const).map((which) => (
            <PeriodCard
              key={which}
              which={which}
              period={data[which]}
              onToggle={(enabled) =>
                setPeriod(which, { ...data[which], enabled })
              }
              onOpenEditor={() => setDialogPeriod(which)}
            />
          ))}
        </div>
      ) : (
        <div className="surface-card rounded-2xl p-5 text-center">
          <p className="text-[13px] font-semibold text-neutral-500">{t("hours.closedDayHint")}</p>
        </div>
      )}

      {/* day note — state updates live, persists on blur only */}
      {data.isOpen && (
        <input
          value={data.note}
          onChange={(e) => onChange({ note: e.target.value }, { persist: false })}
          onBlur={() => onChange({ note: data.note })}
          placeholder={t("admin.dayNotePh")}
          maxLength={160}
          className="w-full rounded-xl border border-[#262626] bg-[#121212] px-3.5 py-2.5 text-[12.5px] text-neutral-300 outline-none transition-colors placeholder:text-neutral-700 focus:border-primary/40"
        />
      )}

      {/* copy to other days */}
      {data.isOpen && (
        <div className="surface-card rounded-2xl p-4">
          <button
            type="button"
            onClick={() => setCopyOpen((o) => !o)}
            aria-expanded={copyOpen}
            className="flex w-full items-center justify-between gap-2 text-start"
          >
            <span className="flex items-center gap-2 text-[12.5px] font-bold text-neutral-300">
              <Copy className="h-4 w-4 text-primary/70" />
              {t("admin.copyDay")}
            </span>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-neutral-600 transition-transform rtl:rotate-180",
                copyOpen && "rotate-90 rtl:-rotate-90"
              )}
            />
          </button>
          {copyOpen && (
            <div className="mt-3 animate-scale-in space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-neutral-500">{t("admin.copyDayHelp")}</p>
                <button
                  type="button"
                  onClick={() =>
                    setCopyTargets(allSelected ? [] : DAYS.filter((d) => d !== day).slice())
                  }
                  className="shrink-0 rounded-lg border border-[#2E2A1A] px-2 py-0.5 text-[10px] font-bold text-neutral-400 transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {allSelected ? t("hours.copyNone") : t("hours.copyAll")}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.filter((d) => d !== day).map((d) => {
                  const selected = copyTargets.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setCopyTargets((arr) =>
                          selected ? arr.filter((x) => x !== d) : [...arr, d]
                        )
                      }
                      className={cn(
                        "flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors",
                        selected
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-[#2E2A1A] text-neutral-500 hover:text-neutral-200"
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {t(DAY_SHORT_KEY[d])}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={copying || copyTargets.length === 0}
                onClick={doCopy}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-primary/50 bg-primary/10 py-2 text-[12px] font-bold text-primary transition-colors hover:bg-primary/20 disabled:pointer-events-none disabled:opacity-40"
              >
                {copying ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {t("admin.copyApply")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* time edit popup */}
      <TimeDialog
        open={dialogPeriod !== null}
        which={dialogPeriod}
        dayName={t(DAY_KEY[day])}
        period={dialogPeriod ? data[dialogPeriod] : null}
        other={dialogPeriod === "morning" ? data.evening : data.morning}
        onClose={() => setDialogPeriod(null)}
        onConfirm={(p) => {
          if (dialogPeriod) setPeriod(dialogPeriod, p);
          setDialogPeriod(null);
        }}
      />
    </div>
  );
}

/* ================= period card ================= */
function PeriodCard({
  which,
  period,
  onToggle,
  onOpenEditor,
}: {
  which: "morning" | "evening";
  period: Period;
  onToggle: (enabled: boolean) => void;
  onOpenEditor: () => void;
}) {
  const { t } = useI18n();
  const Icon = which === "morning" ? Sunrise : MoonStar;

  return (
    <div
      className={cn(
        "surface-card relative flex flex-col rounded-2xl p-4 transition-colors",
        period.enabled ? "" : "opacity-70"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl border transition-colors",
              period.enabled
                ? "border-primary/30 bg-primary/10"
                : "border-[#262626] bg-[#151515]"
            )}
          >
            <Icon
              className={cn("h-5 w-5", period.enabled ? "text-primary" : "text-neutral-600")}
              strokeWidth={1.9}
            />
          </span>
          <div>
            <p className="text-[14px] font-bold text-neutral-100">
              {t(which === "morning" ? "hours.morningPeriod" : "hours.eveningPeriod")}
            </p>
            <p className="text-[10.5px] text-neutral-600">
              {period.enabled ? t("hours.editTimes") : t("hours.periodDisabled")}
            </p>
          </div>
        </div>
        <Switch
          checked={period.enabled}
          onCheckedChange={onToggle}
          aria-label={t(which === "morning" ? "hours.morningPeriod" : "hours.eveningPeriod")}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {period.enabled && (
        <button
          type="button"
          onClick={onOpenEditor}
          className="group/period mt-3.5 flex w-full items-center justify-between gap-2 rounded-xl border border-[#2A2A1E] bg-[#0F0F0F] px-3.5 py-3 text-start transition-all duration-150 hover:border-primary/45 active:translate-y-px"
        >
          <span className="flex flex-col gap-1">
            <span className="text-[10px] font-black tracking-[0.14em] text-neutral-600 uppercase">
              {t("admin.slotStart")} / {t("admin.slotEnd")}
            </span>
            <span className="font-display text-[19px] font-black tabular-nums text-neutral-100" dir="ltr">
              {minToHHMM(period.startMin)} — {minToHHMM(period.endMin)}
            </span>
          </span>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#2E2A1A] bg-[#161616] text-neutral-500 transition-colors group-hover/period:border-primary/50 group-hover/period:text-primary">
            <Pencil className="h-4 w-4" />
          </span>
        </button>
      )}
    </div>
  );
}

/* ================= time edit popup ================= */
const PRESETS: Record<"morning" | "evening", [number, number][]> = {
  morning: [
    [360, 720], // 06:00–12:00
    [300, 660], // 05:00–11:00
    [420, 780], // 07:00–13:00
    [480, 720], // 08:00–12:00
  ],
  evening: [
    [960, 1380], // 16:00–23:00
    [1020, 1320], // 17:00–22:00
    [900, 1260], // 15:00–21:00
    [1080, 1380], // 18:00–23:00
  ],
};

function TimeDialog({
  open,
  which,
  dayName,
  period,
  other,
  onClose,
  onConfirm,
}: {
  open: boolean;
  which: "morning" | "evening" | null;
  dayName: string;
  period: Period | null;
  other: Period;
  onClose: () => void;
  onConfirm: (p: Period) => void;
}) {
  const { t } = useI18n();
  const [startMin, setStartMin] = React.useState(360);
  const [endMin, setEndMin] = React.useState(720);

  // sync local state each time the popup opens
  React.useEffect(() => {
    if (open && period) {
      setStartMin(period.startMin);
      setEndMin(period.endMin);
    }
  }, [open, period]);

  if (!which || !period) return null;

  const error =
    endMin <= startMin
      ? t("hours.slotOrder")
      : other.enabled && startMin < other.endMin && other.startMin < endMin
        ? t("hours.overlap")
        : null;

  const apply = (s: number, e: number) => {
    setStartMin(s);
    setEndMin(e);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-[400px] border-[#262626] bg-[#0E0E0E] p-5 sm:max-w-[400px]"
      >
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2.5 text-start font-display text-[16px] font-black text-neutral-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10">
              {which === "morning" ? (
                <Sunrise className="h-4 w-4 text-primary" />
              ) : (
                <MoonStar className="h-4 w-4 text-primary" />
              )}
            </span>
            {t(which === "morning" ? "hours.morningPeriod" : "hours.eveningPeriod")}
            <span className="text-[12px] font-bold text-neutral-500">· {dayName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* time inputs */}
        <div className="flex items-center gap-3">
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[10px] font-black tracking-[0.14em] text-neutral-500 uppercase">
              {t("admin.slotStart")}
            </span>
            <input
              type="time"
              value={minToHHMM(startMin)}
              onChange={(e) => e.target.value && setStartMin(hhmmToMin(e.target.value))}
              dir="ltr"
              className="h-12 w-full rounded-xl border border-[#2A2A1E] bg-[#141414] px-3 text-center text-[17px] font-black tabular-nums text-neutral-100 outline-none transition-colors [color-scheme:dark] focus:border-primary/50"
            />
          </label>
          <span className="mt-6 text-neutral-700">—</span>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="text-[10px] font-black tracking-[0.14em] text-neutral-500 uppercase">
              {t("admin.slotEnd")}
            </span>
            <input
              type="time"
              value={minToHHMM(endMin)}
              onChange={(e) => e.target.value && setEndMin(hhmmToMin(e.target.value))}
              dir="ltr"
              className="h-12 w-full rounded-xl border border-[#2A2A1E] bg-[#141414] px-3 text-center text-[17px] font-black tabular-nums text-neutral-100 outline-none transition-colors [color-scheme:dark] focus:border-primary/50"
            />
          </label>
        </div>

        {/* quick presets */}
        <div>
          <p className="mb-2 text-[10px] font-black tracking-[0.14em] text-neutral-500 uppercase">
            {t("hours.quickPresets")}
          </p>
          <div className="grid grid-cols-2 gap-2" dir="ltr">
            {PRESETS[which].map(([s, e]) => {
              const active = s === startMin && e === endMin;
              return (
                <button
                  key={`${s}-${e}`}
                  type="button"
                  onClick={() => apply(s, e)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-[12.5px] font-bold tabular-nums transition-colors",
                    active
                      ? "border-primary/60 bg-primary/15 text-primary"
                      : "border-[#262626] bg-[#131313] text-neutral-400 hover:border-primary/40 hover:text-neutral-100"
                  )}
                >
                  {minToHHMM(s)} — {minToHHMM(e)}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive">
            {error}
          </p>
        )}

        {/* actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-[#2A2A1A] bg-[#161616] text-[13px] font-bold text-neutral-300 transition-colors hover:border-[#3A3A28] hover:text-neutral-100"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            disabled={!!error}
            onClick={() => onConfirm({ ...period, startMin, endMin })}
            className="h-11 flex-1 rounded-xl bg-[linear-gradient(180deg,#FFE066_0%,#F5C400_50%,#DBA900_100%)] text-[13px] font-black text-[#3A2D00] shadow-[inset_0_1px_0_rgba(255,255,255,.42),inset_0_-2px_0_rgba(138,101,0,.5),0_1px_3px_rgba(0,0,0,.4)] transition-all duration-150 hover:brightness-[1.06] active:translate-y-px active:shadow-[inset_0_2px_5px_rgba(0,0,0,.35)] disabled:pointer-events-none disabled:opacity-40"
          >
            {t("common.save")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
