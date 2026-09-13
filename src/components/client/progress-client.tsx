"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Camera,
  TrendingUp,
  Ruler,
  ChevronDown,
  Trash2,
  CheckCircle2,
  Dumbbell,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useI18n, type DictKey } from "@/i18n";
import { PageHeader, EmptyState, SectionTitle } from "./ui";
import { Field, SubmitButton } from "@/components/brand/field";
import { addProgressEntryAction, addProgressPhotoAction, deleteProgressPhotoAction } from "@/server-actions/client";
import { useMgAction } from "@/lib/use-mg-action";
import {
  ExerciseProgress,
  type WorkoutLogLite,
  type ExerciseLite,
} from "./exercise-progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  date: string;
  weight: number | null;
  height: number | null;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  bodyFat: number | null;
  notes: string | null;
}

interface Photo {
  id: string;
  category: "front" | "side" | "back";
  dataPath: string;
  date: string;
}

const METRICS: { key: keyof Entry; labelKey: DictKey; unit: string; color: string }[] = [
  { key: "weight", labelKey: "progress.weight", unit: "kg", color: "#F5C400" },
  { key: "waist", labelKey: "progress.waist", unit: "cm", color: "#22C55E" },
  { key: "chest", labelKey: "progress.chest", unit: "cm", color: "#B8860B" },
  { key: "arms", labelKey: "progress.arms", unit: "cm", color: "#F59E0B" },
  { key: "bodyFat", labelKey: "progress.bodyFat", unit: "%", color: "#EF4444" },
];

export function ProgressClient({
  entries,
  photos,
  workoutLogs,
  exercises,
}: {
  entries: Entry[];
  photos: Photo[];
  workoutLogs: WorkoutLogLite[];
  exercises: ExerciseLite[];
}) {
  const { t, fmtDate, locale } = useI18n();
  const [chartMetric, setChartMetric] = useState<keyof Entry>("weight");
  const [tab, setTab] = useState<"measures" | "exercises">("measures");
  const [state, formAction, pending] = useMgAction(addProgressEntryAction);
  const [photoCat, setPhotoCat] = useState<"front" | "side" | "back">("front");
  const [uploading, setUploading] = useState(false);

  const chartData = useMemo(
    () =>
      entries
        .filter((e) => e[chartMetric] !== null && e[chartMetric] !== undefined)
        .map((e) => ({
          date: new Date(e.date).getTime(),
          value: e[chartMetric] as number,
        })),
    [entries, chartMetric]
  );

  const latest = entries[entries.length - 1];
  const prev = entries[entries.length - 2];

  const handlePhotoUpload = async (file: File) => {
    setUploading(true);
    try {
      // resize to max 640px
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });
      const max = 640;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      const out = canvas.toDataURL("image/jpeg", 0.8);

      const res = await addProgressPhotoAction(photoCat, out);
      if (res.ok) toast.success(t("progress.photoAdded"));
      else toast.error(t(res.error as never));
    } catch {
      toast.error(t("validation.serverError"));
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (id: string) => {
    const res = await deleteProgressPhotoAction(id);
    if (!res.ok) toast.error(t("validation.serverError"));
    else toast.success(t("common.delete"));
    setTimeout(() => window.location.reload(), 400);
  };

  const metricLabel = METRICS.find((m) => m.key === chartMetric)!;
  const delta =
    latest && prev && latest[chartMetric] != null && prev[chartMetric] != null
      ? ((latest[chartMetric] as number) - (prev[chartMetric] as number)).toFixed(1)
      : null;

  return (
    <div>
      <PageHeader title={t("progress.title")}>
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-black shadow-[0_6px_20px_-8px_rgba(245,196,0,0.5)] transition-all hover:bg-[#ffd700] active:scale-95">
              <Plus className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="surface-elevated border-border/70 mx-auto max-h-[88dvh] max-w-lg rounded-t-3xl border-t pb-safe">
            <SheetHeader className="pb-0">
              <SheetTitle className="font-display text-left text-[17px] font-black text-neutral-50 rtl:text-right">
                {t("progress.addEntry")}
              </SheetTitle>
            </SheetHeader>
            <form action={formAction} className="space-y-4 overflow-y-auto px-4 pb-6 pt-2">
              {state && !state.ok && (
                <p className="text-xs font-medium text-danger">{t(state.error as never)}</p>
              )}
              {state?.ok && (
                <p className="flex items-center gap-2 text-xs font-semibold text-success">
                  <CheckCircle2 className="h-4 w-4" /> {t("progress.entrySaved")}
                </p>
              )}
              <Field
                id="pr-date"
                name="date"
                type="date"
                label={t("common.date")}
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
              <div className="grid grid-cols-2 gap-3">
                {METRICS.map((m) => (
                  <Field
                    key={m.key}
                    id={`pr-${m.key}`}
                    name={m.key}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    label={`${t(m.labelKey)} (${m.unit})`}
                    placeholder="—"
                  />
                ))}
                <Field
                  id="pr-height"
                  name="height"
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  label={`${t("progress.height")} (cm)`}
                  placeholder="—"
                />
              </div>
              <Field
                id="pr-notes"
                name="notes"
                label={`${t("common.notes")} (${t("common.optional")})`}
                placeholder="…"
              />
              <SubmitButton pending={pending}>{t("common.save")}</SubmitButton>
            </form>
          </SheetContent>
        </Sheet>
      </PageHeader>

      {/* ===== measures / exercises tab switch ===== */}
      <div className="mb-4 flex rounded-xl border border-neutral-800 bg-[#0e0e0e] p-1">
        {(
          [
            { v: "measures", label: t("exprog.measures"), icon: Ruler },
            { v: "exercises", label: t("exprog.exercises"), icon: Dumbbell },
          ] as const
        ).map((seg) => (
          <button
            key={seg.v}
            type="button"
            onClick={() => setTab(seg.v)}
            className={cn(
              "flex h-10 flex-1 items-center justify-center gap-1.5 rounded-lg text-[12.5px] font-bold transition-colors",
              tab === seg.v ? "bg-primary text-black" : "text-neutral-500"
            )}
          >
            <seg.icon className="h-4 w-4" />
            {seg.label}
          </button>
        ))}
      </div>

      {tab === "exercises" ? (
        <ExerciseProgress logs={workoutLogs} exercises={exercises} />
      ) : (
      <>

      {/* ===== summary + chart ===== */}
      {entries.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title={t("progress.noEntries")}
          desc={t("progress.noEntriesDesc")}
        />
      ) : (
        <>
          {/* latest summary */}
          <div className="grid grid-cols-3 gap-3">
            {METRICS.slice(0, 3).map((m) => {
              const v = latest?.[m.key];
              const pv = prev?.[m.key];
              const d =
                v != null && pv != null ? (v as number) - (pv as number) : null;
              return (
                <div key={m.key} className="surface-card rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase">{t(m.labelKey)}</p>
                  <p className="font-display mt-1 text-lg font-black text-neutral-100 tabular-nums">
                    {v ?? "—"}
                    {v != null && <span className="ms-1 text-[10px] text-neutral-500">{m.unit}</span>}
                  </p>
                  {d !== null && d !== 0 && (
                    <p
                      className={cn(
                        "mt-0.5 text-[10px] font-bold tabular-nums",
                        d < 0 ? "text-success" : "text-warning"
                      )}
                    >
                      {d > 0 ? "+" : ""}
                      {d.toFixed(1)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* chart */}
          <section className="mt-6">
            <SectionTitle>{t("progress.charts")}</SectionTitle>
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {METRICS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key)}
                  className={cn(
                    "shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                    chartMetric === m.key
                      ? "bg-primary text-black"
                      : "border border-neutral-800 text-neutral-500 hover:border-neutral-600"
                  )}
                >
                  {t(m.labelKey)}
                </button>
              ))}
            </div>
            <div className="surface-card mt-3 rounded-2xl p-4 pt-6">
              <p className="mb-2 text-center text-[11px] font-bold text-neutral-500">
                {t("progress.overTime", { metric: t(metricLabel.labelKey) })}
                {delta && (
                  <span className={cn("ms-2", Number(delta) < 0 ? "text-success" : "text-warning")}>
                    ({Number(delta) > 0 ? "+" : ""}
                    {delta})
                  </span>
                )}
              </p>
              <div className="h-[210px] w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="#1c1c1c" strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      type="number"
                      scale="time"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(ts) =>
                        new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-GB", {
                          month: "short",
                        }).format(new Date(ts))
                      }
                      stroke="#525252"
                      tick={{ fontSize: 10, fill: "#737373" }}
                      tickLine={false}
                      axisLine={{ stroke: "#262626" }}
                    />
                    <YAxis
                      stroke="#525252"
                      tick={{ fontSize: 10, fill: "#737373" }}
                      tickLine={false}
                      axisLine={{ stroke: "#262626" }}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#161616",
                        border: "1px solid rgba(245,196,0,0.25)",
                        borderRadius: 10,
                        fontSize: 12,
                        color: "#f5f5f5",
                      }}
                      labelFormatter={(ts) =>
                        new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }).format(new Date(ts as number))
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={metricLabel.color}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: metricLabel.color, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ===== photos ===== */}
      <section className="mt-7">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            {t("progress.photos")}
            <span className="text-[9px] font-semibold text-neutral-700">· {t("progress.photosPrivate")}</span>
          </span>
        </SectionTitle>

        {/* category tabs */}
        <div className="mb-3 flex gap-2">
          {(["front", "side", "back"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setPhotoCat(c)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors",
                photoCat === c
                  ? "bg-primary text-black"
                  : "border border-neutral-800 text-neutral-500"
              )}
            >
              {t(`progress.${c}` as DictKey)}
            </button>
          ))}

          <label
            className={cn(
              "ms-auto flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-primary/35 px-3 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary/10",
              uploading && "opacity-60"
            )}
          >
            <Camera className="h-3.5 w-3.5" />
            {uploading ? t("common.loading") : t("progress.addPhoto")}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePhotoUpload(f);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {photos.length === 0 ? (
          <EmptyState icon={Camera} title={t("progress.noPhotos")} desc={t("progress.noPhotosDesc")} />
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-neutral-800">
                { }
                <img src={p.dataPath} alt={p.category} className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-5">
                  <p className="text-[9px] font-bold text-neutral-300">
                    {fmtDate(p.date, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <button
                  onClick={() => deletePhoto(p.id)}
                  aria-label={t("common.delete")}
                  className="absolute end-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/70 text-neutral-400 opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== history list ===== */}
      {entries.length > 0 && (
        <section className="mt-7">
          <SectionTitle>{t("progress.measures")}</SectionTitle>
          <div className="surface-card overflow-hidden rounded-xl">
            <div className="divide-y divide-neutral-800/70">
              {[...entries].reverse().slice(0, 10).map((e) => (
                <details key={e.id} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between p-3.5">
                    <div className="flex items-center gap-2.5">
                      <Ruler className="h-4 w-4 text-neutral-600" />
                      <span className="text-[13px] font-semibold text-neutral-200">
                        {fmtDate(e.date, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {e.weight != null && (
                        <span className="text-[12px] font-bold text-primary tabular-nums">
                          {e.weight} {t("progress.kg")}
                        </span>
                      )}
                      <ChevronDown className="h-4 w-4 text-neutral-600 transition-transform group-open:rotate-180" />
                    </div>
                  </summary>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-2 bg-[#0d0d0d] px-4 py-3 text-[11px]">
                    {METRICS.map((m) => (
                      <div key={m.key}>
                        <span className="text-neutral-600">{t(m.labelKey)}: </span>
                        <span className="font-semibold text-neutral-300 tabular-nums">
                          {e[m.key] ?? "—"} {e[m.key] != null ? m.unit : ""}
                        </span>
                      </div>
                    ))}
                    {e.notes && <p className="col-span-3 text-neutral-500 italic">{e.notes}</p>}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
      </>
      )}
    </div>
  );
}
