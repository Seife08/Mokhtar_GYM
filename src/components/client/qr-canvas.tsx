"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";

/**
 * Renders a QR code into a canvas, MOKHTAR-styled.
 * Content = opaque token only — no personal data.
 */
export function QrCanvas({
  value,
  size = 220,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    QRCode.toCanvas(
      ref.current,
      value,
      {
        width: size,
        margin: 1,
        color: { dark: "#0a0a0aff", light: "#f5f5f5ff" },
        errorCorrectionLevel: "M",
      },
      (err) => {
        if (err) console.error("QR render error", err);
      }
    );
  }, [value, size]);

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-[#f5f5f5] p-3.5 shadow-[0_0_50px_-12px_rgba(245,196,0,0.35)]",
        className
      )}
    >
      {/* gold corner brackets */}
      <span className="absolute -left-1 -top-1 h-5 w-5 rounded-tl-lg border-s-2 border-t-2 border-primary" />
      <span className="absolute -right-1 -top-1 h-5 w-5 rounded-tr-lg border-e-2 border-t-2 border-primary" />
      <span className="absolute -bottom-1 -left-1 h-5 w-5 rounded-bl-lg border-b-2 border-s-2 border-primary" />
      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-br-lg border-b-2 border-e-2 border-primary" />
      <canvas ref={ref} width={size} height={size} className="block rounded-lg" aria-label="QR code" role="img" />
    </div>
  );
}
