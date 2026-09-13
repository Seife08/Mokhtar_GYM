"use client";

/**
 * CheckinClient — fires the NFC check-in the moment the page opens, then
 * shows a big clear result (granted / already / denied) with the exact
 * timestamp. This page is opened automatically when the member taps the
 * door NFC tag, so the flow is zero-tap: open → record → confirm.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Loader2, ArrowRight, Nfc, User } from "lucide-react";
import { useI18n } from "@/i18n";
import { nfcCheckinAction } from "@/server-actions/client";

type Phase = "processing" | "CHECKED_IN" | "ALREADY" | "DENIED";

export function CheckinClient({ name, avatar }: { name: string; avatar: string | null }) {
  const { t, fmtTime } = useI18n();
  const [phase, setPhase] = useState<Phase>("processing");
  const [checkInAt, setCheckInAt] = useState<string | null>(null);
  const [monthVisits, setMonthVisits] = useState<number | null>(null);
  const firedRef = useRef(false); // react strict-mode safe

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    (async () => {
      try {
        const res = await nfcCheckinAction();
        if (res.ok && res.outcome) {
          setPhase(res.outcome);
          setCheckInAt(res.checkInAt ?? new Date().toISOString());
          setMonthVisits(res.monthVisits ?? null);
          if (res.outcome === "CHECKED_IN") {
            // haptic confirmation on supporting phones
            navigator.vibrate?.([40, 60, 120]);
          }
        } else {
          setPhase("DENIED");
        }
      } catch {
        setPhase("DENIED");
      }
    })();
  }, []);

  const tone =
    phase === "CHECKED_IN"
      ? { icon: CheckCircle2, color: "#22C55E", border: "border-success/40" }
      : phase === "ALREADY"
        ? { icon: Clock, color: "#F5C400", border: "border-primary/40" }
        : { icon: XCircle, color: "#EF4444", border: "border-danger/40" };

  const Icon = tone.icon;

  return (
    <div className="brand-bg flex min-h-dvh flex-col items-center justify-center px-6">
      {/* emblem watermark */}
      <Nfc className="pointer-events-none absolute end-6 top-6 h-7 w-7 text-primary/20" />

      {phase === "processing" ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5"
        >
          <div className="relative flex h-24 w-24 items-center justify-center">
            <motion.span
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.15, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full border-2 border-primary/50"
            />
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
          <p className="text-[15px] font-bold text-neutral-200">{t("checkin.processing")}</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}
          className="flex w-full max-w-sm flex-col items-center"
        >
          {/* member */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-[#151515]"
          >
            {avatar ? (
              <img src={avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-7 w-7 text-primary" />
            )}
          </motion.div>
          <p className="mt-3 text-[16px] font-black text-neutral-100">
            {t("checkin.welcome", { name })}
          </p>

          {/* verdict */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 300, damping: 18 }}
            className={`mt-6 flex flex-col items-center gap-3 rounded-3xl border ${tone.border} bg-[#0c0c0c] px-10 py-8`}
          >
            <Icon className="h-16 w-16" style={{ color: tone.color }} strokeWidth={1.6} />
            <p className="font-display text-[19px] font-black" style={{ color: tone.color }}>
              {phase === "CHECKED_IN"
                ? t("checkin.success")
                : phase === "ALREADY"
                  ? t("checkin.already")
                  : t("checkin.denied")}
            </p>
            {(phase === "ALREADY" || phase === "DENIED") && (
              <p className="max-w-[240px] text-center text-[12.5px] leading-relaxed text-neutral-500">
                {phase === "ALREADY" ? t("checkin.alreadyDesc") : t("checkin.deniedDesc")}
              </p>
            )}
          </motion.div>

          {/* stats */}
          {phase !== "DENIED" && (
            <div className="mt-5 grid w-full grid-cols-2 gap-3">
              <div className="surface-card rounded-xl p-3.5 text-center">
                <p className="font-display text-[17px] font-black text-primary tabular-nums">
                  {checkInAt ? fmtTime(checkInAt) : "—"}
                </p>
                <p className="mt-0.5 text-[9.5px] font-bold text-neutral-500">{t("checkin.time")}</p>
              </div>
              <div className="surface-card rounded-xl p-3.5 text-center">
                <p className="font-display text-[17px] font-black text-primary tabular-nums">
                  {monthVisits ?? "—"}
                </p>
                <p className="mt-0.5 text-[9.5px] font-bold text-neutral-500">{t("checkin.monthVisits")}</p>
              </div>
            </div>
          )}

          <Link
            href="/client"
            className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-extrabold tracking-wider text-black transition-all hover:bg-[#ffd700] active:scale-[0.98]"
          >
            {t("checkin.back")}
            <ArrowRight className="h-5 w-5 rtl-flip" />
          </Link>
        </motion.div>
      )}
    </div>
  );
}
