"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, ImagePlus, X } from "lucide-react";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";

/**
 * Client-side image picker with canvas resize → base64.
 * Keeps payloads small and validates type/size before upload.
 *
 * - Optional by design: a remove (×) badge lets the user clear the photo.
 * - Decoding failures (e.g. HEIC shot outside iOS Safari, where the browser
 *   can't decode the format) surface a clear "use JPG/PNG" message instead
 *   of a generic server error.
 * - Files up to 15MB are accepted: the canvas resizes them down to `size`
 *   anyway, so the browser only needs to *read* the original.
 */
const MAX_FILE_BYTES = 15 * 1024 * 1024;

export function AvatarPicker({
  value,
  onChange,
  size = 96,
  className,
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  size?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith("image/") && !/\.(heic|heif|avif|webp)$/i.test(file.name)) {
      setError(t("validation.invalidImage"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(t("validation.fileTooLarge"));
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // resize to square — a decode failure here means the browser can't
      // read the format (typical: HEIC on non-Apple browsers)
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      onChange(canvas.toDataURL("image/jpeg", 0.85));
    } catch {
      setError(t("validation.unsupportedImage"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <div className="relative" style={{ width: size, height: size }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-primary/30 bg-[#111] transition-all hover:border-primary/60 active:scale-95"
          aria-label={t("auth.changePhoto")}
        >
          {value ? (
            <img
              src={value}
              alt="avatar"
              className="h-full w-full object-cover"
            />
          ) : busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          ) : (
            <Camera className="h-7 w-7 text-neutral-500 transition-colors group-hover:text-primary" />
          )}
        </button>
        {value && !busy && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            aria-label={t("auth.removePhoto")}
            title={t("auth.removePhoto")}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-neutral-700 bg-[#181818] text-neutral-400 transition-all hover:border-danger/60 hover:text-danger active:scale-90"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-neutral-400 transition-colors hover:text-primary"
      >
        <ImagePlus className="h-4 w-4" />
        {value ? t("auth.changePhoto") : t("auth.uploadPhoto")}
      </button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
