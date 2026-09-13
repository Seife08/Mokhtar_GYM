"use client";

import { useState } from "react";
import { RefreshCw, ShieldCheck, ShieldAlert, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/i18n";
import { PageHeader } from "./ui";
import { QrCanvas } from "./qr-canvas";
import { NfcGate } from "./nfc-gate";
import { regenerateQrTokenAction } from "@/server-actions/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/brand/status-badge";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, "active" | "expiring" | "expired" | "paused" | "inactive"> = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring",
  EXPIRED: "expired",
  PAUSED: "paused",
  CANCELLED: "cancelled" as never,
  NONE: "inactive",
};

export function QrPage({
  name,
  status,
  qrToken,
}: {
  name: string;
  status: string;
  qrToken: string;
}) {
  const { t } = useI18n();
  const [token, setToken] = useState(qrToken);
  const [pending, setPending] = useState(false);

  const regenerate = async () => {
    setPending(true);
    try {
      const res = await regenerateQrTokenAction();
      if (res.ok) {
        // refetch token from server would need round-trip; user.token changed
        // simplest: reload page state
        toast.success(t("qr.regenerated"));
        setTimeout(() => window.location.reload(), 600);
      } else {
        toast.error(t("validation.serverError"));
      }
    } finally {
      setPending(false);
    }
  };

  const tone = STATUS_TONE[status] ?? "inactive";

  return (
    <div>
      <PageHeader title={t("qr.title")} />

      <div className="animate-scale-in flex flex-col items-center rounded-2xl border border-primary/15 bg-[#0d0d0d] px-5 py-8">
        {/* avatar */}
        <span className="font-display flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-[#151515] text-xl font-black text-primary">
          {name.charAt(0).toUpperCase()}
        </span>
        <p className="mt-3 text-[16px] font-bold text-neutral-100">{name}</p>
        <div className="mt-2">
          <StatusBadge tone={tone === "expired" ? "expired" : tone === "active" ? "active" : tone === "expiring" ? "expiring" : tone === "paused" ? "paused" : "inactive"} />
        </div>

        {/* QR */}
        <div className="mt-7">
          <QrCanvas value={`MG1:${token}`} size={230} />
        </div>

        <p className="mt-6 max-w-[280px] text-center text-[13px] leading-relaxed text-neutral-400">
          {t("qr.showAtEntrance")}
        </p>

        <p className="mt-4 flex items-center gap-1.5 text-[11px] text-neutral-600">
          <ShieldCheck className="h-3.5 w-3.5 text-primary/60" />
          {t("qr.privateNote")}
        </p>
      </div>

      {/* NFC gate — tap-to-enter alongside the QR */}
      <NfcGate />

      <div className="mt-5 flex justify-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 px-5 py-2.5 text-[12px] font-bold text-neutral-400 transition-colors hover:border-danger/40 hover:text-danger disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4", pending && "animate-spin")} />
              {t("qr.regenerate")}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="surface-elevated border-border/70">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-neutral-100">
                {t("qr.regenerateConfirm")}
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-neutral-700 bg-transparent text-neutral-300 hover:bg-white/5">
                {t("common.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={regenerate}
                className="bg-danger text-white hover:bg-danger/80"
              >
                {t("common.confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
