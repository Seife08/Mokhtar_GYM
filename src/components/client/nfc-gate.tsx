"use client";

/**
 * NfcGate — Web NFC check-in straight from the member's phone.
 * The gym door has an NFC tag encoded with the /checkin URL (or the
 * text marker MG-CHECKIN). Tapping the phone with this panel active
 * reads the tag, fires nfcCheckinAction and confirms with haptics.
 * iOS Safari has no Web NFC → the tag still works by opening the URL.
 */

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Nfc, CheckCircle2, Clock, XCircle, Loader2, ShieldAlert } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { nfcCheckinAction } from "@/server-actions/client";

/* minimal Web NFC typings (not in lib.dom) */
interface NDEFRecordInit {
  recordType?: string;
  data?: unknown;
}
interface NDEFMessage {
  records: { recordType: string; data: unknown }[];
}
interface NDEFReadingEvent {
  serialNumber?: string;
  message?: NDEFMessage;
}
interface NDEFReaderLike {
  scan(options?: { signal?: AbortSignal }): Promise<void>;
  onreading: ((event: NDEFReadingEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
}
type NDEFReaderCtor = new () => NDEFReaderLike;

declare global {
  interface Window {
    NDEFReader?: NDEFReaderCtor;
  }
}

type Phase = "idle" | "scanning" | "firing" | "CHECKED_IN" | "ALREADY" | "DENIED";

export function NfcGate({ compact = false }: { compact?: boolean }) {
  const { t, fmtTime } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [supported, setSupported] = useState<boolean | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [visits, setVisits] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stopScan = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase((p) => (p === "scanning" || p === "firing" ? "idle" : p));
  };

  const fire = async () => {
    if (phase === "firing") return;
    setPhase("firing");
    stopScan();
    try {
      const res = await nfcCheckinAction();
      if (res.ok && res.outcome) {
        setPhase(res.outcome);
        setTime(res.checkInAt ?? new Date().toISOString());
        setVisits(res.monthVisits ?? null);
        if (res.outcome === "CHECKED_IN") {
          navigator.vibrate?.([40, 60, 140]);
        }
      } else {
        setPhase("DENIED");
      }
    } catch {
      setPhase("DENIED");
    }
  };

  const startScan = async () => {
    const Ctor = window.NDEFReader;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setSupported(true);
    try {
      const reader = new Ctor();
      const controller = new AbortController();
      abortRef.current = controller;

      reader.onreading = (event) => {
        // only the GYM tag may check us in — it carries the /checkin URL
        // or the MG-CHECKIN text marker
        const records = event.message?.records ?? [];
        for (const record of records) {
          let text = "";
          try {
            text = new TextDecoder().decode(record.data as ArrayBuffer);
          } catch {
            continue;
          }
          const isUrl = record.recordType === "url" || text.startsWith("http");
          if ((isUrl && text.includes("/checkin")) || text.startsWith("MG-CHECKIN")) {
            fire();
            return;
          }
        }
      };
      reader.onerror = () => {
        setPhase("idle");
      };

      await reader.scan({ signal: controller.signal });
      setPhase("scanning");
    } catch {
      setPhase("idle");
    }
  };

  /* result view */
  const showingResult =
    phase === "CHECKED_IN" || phase === "ALREADY" || phase === "DENIED";

  return (
    <div className={cn("surface-card rounded-2xl p-4", !compact && "mt-4")}>
      <div className="flex items-center gap-2.5">
        <Nfc className={cn("h-5 w-5", phase === "scanning" ? "text-primary" : "text-primary/80")} />
        <h2 className="font-display text-[14px] font-black text-neutral-100">
          {t("qr.nfcTitle")}
        </h2>
        {phase === "scanning" && (
          <span className="ms-auto flex items-center gap-1.5 text-[10px] font-black text-primary">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-primary"
            />
            {t("qr.nfcScanning")}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-neutral-500">
        {t("qr.nfcDesc")}
      </p>

      {/* ===== result ===== */}
      <AnimatePresence mode="wait">
        {showingResult ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex flex-col items-center rounded-xl border p-5"
            style={{
              borderColor:
                phase === "CHECKED_IN"
                  ? "rgba(34,197,94,0.4)"
                  : phase === "ALREADY"
                    ? "rgba(245,196,0,0.4)"
                    : "rgba(239,68,68,0.4)",
              background:
                phase === "CHECKED_IN"
                  ? "rgba(34,197,94,0.06)"
                  : phase === "ALREADY"
                    ? "rgba(245,196,0,0.05)"
                    : "rgba(239,68,68,0.05)",
            }}
          >
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 16 }}
            >
              {phase === "CHECKED_IN" ? (
                <CheckCircle2 className="h-11 w-11 text-success" strokeWidth={1.7} />
              ) : phase === "ALREADY" ? (
                <Clock className="h-11 w-11 text-primary" strokeWidth={1.7} />
              ) : (
                <XCircle className="h-11 w-11 text-danger" strokeWidth={1.7} />
              )}
            </motion.div>
            <p
              className={cn(
                "font-display mt-2.5 text-[15px] font-black",
                phase === "CHECKED_IN"
                  ? "text-success"
                  : phase === "ALREADY"
                    ? "text-primary"
                    : "text-danger"
              )}
            >
              {phase === "CHECKED_IN"
                ? t("checkin.success")
                : phase === "ALREADY"
                  ? t("checkin.already")
                  : t("checkin.denied")}
            </p>
            <div className="mt-2 flex items-center gap-4 text-[11.5px] font-bold text-neutral-400 tabular-nums">
              {time && (
                <span>
                  {t("checkin.time")}: {fmtTime(time)}
                </span>
              )}
              {visits != null && phase !== "DENIED" && (
                <span>
                  {t("checkin.monthVisits")}: {visits}
                </span>
              )}
            </div>
            {phase === "DENIED" && (
              <p className="mt-1.5 max-w-[250px] text-center text-[11px] text-neutral-500">
                {t("checkin.deniedDesc")}
              </p>
            )}
            <button
              onClick={() => setPhase("idle")}
              className="mt-3.5 rounded-lg border border-neutral-700 px-5 py-2 text-[11.5px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t("common.confirm")}
            </button>
          </motion.div>
        ) : supported === false ? (
          <motion.div
            key="unsupported"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-start gap-3 rounded-xl border border-neutral-800 bg-[#0d0d0d] p-3.5"
          >
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-neutral-600" />
            <div>
              <p className="text-[12px] font-bold text-neutral-300">
                {t("qr.nfcNotSupported")}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                {t("qr.nfcUseTag")}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="controls" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {phase === "scanning" ? (
              <div className="mt-3.5">
                <div className="nfc-pulse relative mx-auto flex h-20 w-20 items-center justify-center">
                  <Nfc className="h-9 w-9 text-primary" />
                </div>
                <p className="mt-2.5 text-center text-[12px] font-bold text-neutral-300">
                  {t("qr.nfcScanningDesc")}
                </p>
                <button
                  onClick={stopScan}
                  className="mx-auto mt-3 block rounded-lg border border-neutral-700 px-5 py-2 text-[11.5px] font-bold text-neutral-400 transition-colors hover:border-danger/40 hover:text-danger"
                >
                  {t("qr.nfcStop")}
                </button>
              </div>
            ) : phase === "firing" ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-[13px] font-bold text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("checkin.processing")}
              </div>
            ) : (
              <button
                onClick={startScan}
                className="mt-3.5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[12.5px] font-extrabold tracking-wide text-black transition-all hover:bg-[#ffd700] active:scale-[0.98]"
              >
                <Nfc className="h-4.5 w-4.5" />
                {t("qr.nfcActivate")}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
