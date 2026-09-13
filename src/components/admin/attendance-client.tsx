"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import jsQR from "jsqr";
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  LogIn,
  Loader2,
  Camera,
  CameraOff,
  UserPlus,
  Search,
  Clock,
  AlertTriangle,
  Nfc,
  Copy,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { StatTile } from "@/components/client/ui";
import { scanQrAction, manualCheckinAction, checkoutAction, type ScanResult } from "@/server-actions/admin-workouts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/brand/status-badge";

interface TodayRecord {
  id: string;
  userId: string;
  name: string;
  avatar: string | null;
  checkInAt: string;
  checkOutAt: string | null;
  method: string;
}

export function AttendanceClient({
  todayRecords,
  stats,
  peakHours,
  mostActive,
  clients,
  doubleCheckinMins,
  nfcGateUrl,
}: {
  todayRecords: TodayRecord[];
  stats: { today: number; week: number; month: number; inGym: number };
  peakHours: number[];
  mostActive: { id: string; name: string; visits: number }[];
  clients: { id: string; name: string }[];
  doubleCheckinMins: number;
  nfcGateUrl: string;
}) {
  const { t, fmtTime, locale } = useI18n();
  const router = useRouter();
  const [records, setRecords] = useState(todayRecords);

  /* ===== LIVE SYNC =====
     every member NFC/QR check-in revalidates this path server-side;
     a light refresh loop keeps the list, stats and charts in step
     while the tab is visible (pauses in background — battery safe). */
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 12_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  // scanner state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastScanRef = useRef(0);

  // manual check-in
  const [manualOpen, setManualOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleToken = useCallback(
    async (token: string) => {
      // debounce duplicate decodes
      if (Date.now() - lastScanRef.current < 2200) return;
      lastScanRef.current = Date.now();
      setProcessing(true);
      const res = await scanQrAction(token);
      setProcessing(false);
      setScanResult(res);
      if (res.ok && res.checkinRecorded) {
        toast.success(t("admin.checkinRecorded"));
        // refresh the RSC tree without a hard reload
        router.refresh();
      }
      if (res.ok) {
        setTimeout(() => setScanResult(null), 5200);
      }
    },
    [t]
  );

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
      }
      setScanning(true);

      const tick = () => {
        if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
        const video = videoRef.current;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          const canvas = canvasRef.current;
          const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code?.data) {
            handleToken(code.data);
          }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch (err) {
      console.error("camera error", err);
      toast.error(t("admin.cameraError"));
      setScanning(false);
    }
  }, [handleToken, t]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const manualCheckin = async (userId: string) => {
    const res = await manualCheckinAction(userId);
    if (res.ok) {
      toast.success(t("admin.checkinRecorded"));
      setManualOpen(false);
      router.refresh();
    } else {
      toast.error(t(res.error as never));
    }
  };

  const doCheckout = async (attendanceId: string) => {
    const res = await checkoutAction(attendanceId);
    if (res.ok) {
      toast.success(t("admin.checkOut"));
      setRecords((prev) =>
        prev.map((r) => (r.id === attendanceId ? { ...r, checkOutAt: new Date().toISOString() } : r))
      );
    }
  };

  const filteredClients = manualQuery
    ? clients.filter((c) => c.name.toLowerCase().includes(manualQuery.toLowerCase())).slice(0, 8)
    : clients.slice(0, 8);

  const peakHourLabels = Array.from({ length: 15 }, (_, i) => `${i + 8}`);
  const maxPeak = Math.max(...peakHours, 1);

  const result = scanResult;
  const granted =
    result?.client &&
    (result.client.membershipStatus === "ACTIVE" ||
      result.client.membershipStatus === "EXPIRING_SOON");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
            {t("admin.attendance")}
          </h1>
          {/* live indicator — polling every 12s while visible */}
          <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/[0.07] px-2.5 py-1 text-[10px] font-black text-success">
            <motion.span
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-success"
            />
            {t("admin.liveNow")}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setManualOpen(true)}
            className="flex h-10 items-center gap-2 rounded-lg border border-neutral-700 px-4 text-[12.5px] font-bold text-neutral-200 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <UserPlus className="h-4.5 w-4.5" />
            {t("admin.manualCheckin")}
          </button>
        </div>
      </div>

      {/* ===== NFC gate URL — write it on the door tag ===== */}
      <NfcGateCard url={nfcGateUrl} />

      {/* ===== stats ===== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label={t("admin.todaysVisits")} value={stats.today} icon={LogIn} accent="gold" />
        <StatTile label={t("admin.inGymNow")} value={stats.inGym} icon={Clock} accent="success" />
        <StatTile label={t("admin.weeklyVisits")} value={stats.week} icon={ScanLine} />
        <StatTile label={t("admin.monthlyVisits")} value={stats.month} icon={ScanLine} />
      </div>

      {/* ===== QR scanner ===== */}
      <div className="surface-card overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[#1c1c1c] p-4">
          <div className="flex items-center gap-2.5">
            <ScanLine className="h-5 w-5 text-primary" />
            <h2 className="font-display text-[15px] font-black tracking-wide text-neutral-100">
              {t("admin.scanTitle")}
            </h2>
          </div>
          {scanning ? (
            <button
              onClick={stopCamera}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-danger/40 px-3.5 text-[11.5px] font-bold text-danger transition-colors hover:bg-danger/10"
            >
              <CameraOff className="h-4 w-4" />
              {t("admin.stopCamera")}
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-[11.5px] font-extrabold text-black transition-colors hover:bg-[#ffd700]"
            >
              <Camera className="h-4 w-4" />
              {t("admin.startCamera")}
            </button>
          )}
        </div>

        <div className="scanner-overlay relative aspect-[4/3] w-full bg-[#050505] sm:aspect-video">
          <video
            ref={videoRef}
            className={cn("h-full w-full object-cover", !scanning && "opacity-30")}
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* frame */}
          {scanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="scanner-frame relative h-[62%] w-[62%] max-w-[300px]">
                <div className="scanner-line" />
              </div>
            </div>
          )}

          {/* hint overlay */}
          {!scanning && !result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              <ScanLine className="h-10 w-10 text-neutral-700" />
              <p className="text-[13px] font-semibold text-neutral-500">{t("admin.scanHint")}</p>
              <p className="text-[11px] text-neutral-700">
                {t("admin.doubleCheckin")}: {doubleCheckinMins} {t("common.minutes")}
              </p>
            </div>
          )}

          {/* processing indicator */}
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <Loader2 className="h-9 w-9 animate-spin text-primary" />
            </div>
          )}

          {/* ===== scan result ===== */}
          <AnimatePresence>
            {result && result.client && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={cn(
                  "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#080808]/95 p-6",
                  granted ? "border-2 border-inset border-success/50" : "border-2 border-inset border-danger/50"
                )}
              >
                <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 text-[26px] font-black text-primary"
                  style={{ borderColor: granted ? "#22C55E" : "#EF4444" }}>
                  {(result.client.name || "?").charAt(0)}
                </span>
                <p className="text-[18px] font-black text-neutral-50">{result.client.name}</p>
                <div className="flex items-center gap-2.5">
                  <StatusBadge
                    tone={
                      result.client.membershipStatus === "ACTIVE"
                        ? "active"
                        : result.client.membershipStatus === "EXPIRING_SOON"
                          ? "expiring"
                          : result.client.membershipStatus === "PAUSED"
                            ? "paused"
                            : "expired"
                    }
                  />
                  {result.client.remainingDays !== null && (
                    <span className="text-[12px] text-neutral-500">
                      {result.client.remainingDays} {t("common.days")}
                    </span>
                  )}
                </div>
                <motion.div
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className={cn(
                    "mt-2 flex items-center gap-2 rounded-xl border px-5 py-3",
                    granted
                      ? "border-success/40 bg-success/10 text-success"
                      : "border-danger/40 bg-danger/10 text-danger"
                  )}
                >
                  {granted ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <XCircle className="h-6 w-6" />
                  )}
                  <span className="font-display text-[16px] font-black tracking-wide">
                    {granted ? t("admin.accessGranted") : t("admin.accessDenied")}
                  </span>
                </motion.div>
                <p className="text-[12px] text-neutral-500">
                  {result.client.membershipStatus === "EXPIRED"
                    ? t("admin.membershipExpiredMsg")
                    : result.client.membershipStatus === "NONE"
                      ? t("admin.noMembershipRecord")
                      : result.alreadyCheckedIn
                        ? t("admin.alreadyCheckedIn")
                        : t("admin.checkinRecorded")}
                </p>
                {!granted && (
                  <button
                    onClick={() => handleTokenOverride(result.client!.id)}
                    className="mt-1 rounded-lg border border-warning/40 bg-warning/10 px-4 py-2 text-[12px] font-bold text-warning transition-colors hover:bg-warning/20"
                  >
                    {t("admin.overrideAccess")}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ===== analytics row ===== */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* peak hours */}
        <div className="surface-card rounded-2xl p-5">
          <h3 className="mb-4 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            {t("admin.peakHours")}
          </h3>
          <div className="flex h-[120px] items-end gap-1" dir="ltr">
            {peakHours.map((v, i) => (
              <div key={i} className="group relative flex-1">
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-colors",
                    v === maxPeak && v > 0 ? "bg-primary" : "bg-[#3a3a25] group-hover:bg-[#B8860B]"
                  )}
                  style={{ height: `${Math.max(4, (v / maxPeak) * 100)}%` }}
                />
                <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-semibold text-neutral-600">
                  {peakHourLabels[i]}
                </span>
                {v > 0 && (
                  <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] font-bold text-neutral-400 opacity-0 group-hover:opacity-100">
                    {v}
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[10px] text-neutral-600">{t("admin.last30")}</p>
        </div>

        {/* most active */}
        <div className="surface-card rounded-2xl p-5">
          <h3 className="mb-4 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            {t("admin.mostActive")}
          </h3>
          <div className="space-y-2.5">
            {mostActive.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[11px] font-black text-primary">
                  {i + 1}
                </span>
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-neutral-200">{u.name}</p>
                <span className="font-display text-[13px] font-black text-primary tabular-nums">
                  {u.visits}
                </span>
              </div>
            ))}
            {mostActive.length === 0 && (
              <p className="py-4 text-center text-[12px] text-neutral-600">{t("admin.noChange")}</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== today's log ===== */}
      <div className="surface-card overflow-hidden rounded-2xl">
        <h3 className="border-b border-[#1c1c1c] p-4 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
          {t("admin.todaysVisits")} ({records.length})
        </h3>
        <div className="divide-y divide-[#161616]">
          {records.length === 0 && (
            <p className="py-10 text-center text-[13px] text-neutral-600">{t("admin.never")}</p>
          )}
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[12px] font-black text-primary">
                  {r.name.charAt(0)}
                </span>
                <div>
                  <p className="truncate text-[13px] font-semibold text-neutral-200">{r.name}</p>
                  <p className="text-[10.5px] text-neutral-600 tabular-nums">
                    {fmtTime(r.checkInAt)}
                    {r.checkOutAt && ` → ${fmtTime(r.checkOutAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[9px] font-black",
                    r.method === "NFC"
                      ? "bg-primary/15 text-primary"
                      : r.method === "QR"
                        ? "bg-blue-500/15 text-blue-400"
                        : "bg-[#1a1a1a] text-neutral-500"
                  )}
                >
                  {r.method}
                </span>
                {!r.checkOutAt && (
                  <button
                    onClick={() => doCheckout(r.id)}
                    className="rounded-lg border border-neutral-700 px-2.5 py-1 text-[10px] font-bold text-neutral-300 transition-colors hover:border-warning/40 hover:text-warning"
                  >
                    {t("admin.checkOut")}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== manual check-in dialog ===== */}
      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent className="surface-elevated border-border/70 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-[17px] font-black text-neutral-50">
              {t("admin.manualCheckin")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
              <input
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder={t("admin.searchMembers")}
                className="input-premium h-11 w-full rounded-lg ps-10 pe-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {filteredClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => manualCheckin(c.id)}
                  className="flex w-full items-center gap-3 rounded-lg p-2.5 text-start transition-colors hover:bg-primary/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[11px] font-black text-primary">
                    {c.name.charAt(0)}
                  </span>
                  <span className="flex-1 truncate text-[13px] font-semibold text-neutral-200">{c.name}</span>
                  <LogIn className="h-4 w-4 text-neutral-600" />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  async function handleTokenOverride(userId: string) {
    // re-scan with override: fetch user's QR token is not exposed; use manual check-in instead
    const res = await manualCheckinAction(userId);
    if (res.ok) {
      toast.success(t("admin.checkinRecorded"));
      setScanResult(null);
      router.refresh();
    } else {
      toast.error(t(res.error as never));
    }
  }
}

/* ================= NFC GATE CARD ================= */

function NfcGateCard({ url }: { url: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard blocked — select fallback
    }
  };

  return (
    <div className="surface-card flex flex-wrap items-center gap-3 rounded-2xl border-primary/20 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
        <Nfc className="h-5 w-5 text-primary" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-black text-neutral-100">{t("admin.nfcGate")}</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
          {t("admin.nfcGateHint")} · <span className="text-[10px] text-neutral-600">{t("admin.livePolling")}</span>
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code
          dir="ltr"
          className="hidden max-w-[220px] truncate rounded-lg border border-neutral-800 bg-[#0d0d0d] px-3 py-2 text-[11px] font-semibold text-primary/90 sm:block"
        >
          {url}
        </code>
        <button
          onClick={copy}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-[11.5px] font-extrabold text-black transition-colors hover:bg-[#ffd700]"
        >
          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? t("admin.copied") : "URL"}
        </button>
      </div>
    </div>
  );
}
