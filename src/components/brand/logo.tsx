import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * MOKHTAR GYM emblem — official gold badge (Mokhtar's own artwork).
 *
 * Perpetual motion, minted-coin style:
 * · the badge spins one full rotateY revolution every 12s — never stops,
 *   never reverses, never mirrors the wordmark (two stacked faces with
 *   backface-visibility:hidden, like a real two-sided coin)
 * · a gentle vertical bob + a floor shadow breathing in sync
 * · a metallic sheen sweep across the face
 * Hero instances can additionally track the pointer (`interactive`) —
 * the whole coin leans toward the cursor while the spin keeps running.
 * Users with `prefers-reduced-motion` get a static badge.
 */
export function GymEmblem({
  className,
  animated = true,
  priority,
  interactive = false,
  floorShadow = false,
}: {
  className?: string;
  animated?: boolean;
  /** larger render sizes (splash, auth hero, landing) may want the 512px asset */
  priority?: boolean;
  /** badge follows the pointer (desktop hero usage only) */
  interactive?: boolean;
  /** ground the badge with a synced floor shadow (hero usage only) */
  floorShadow?: boolean;
}) {
  const wrapRef = React.useRef<HTMLSpanElement>(null);
  const [tilt, setTilt] = React.useState<{ x: number; y: number } | null>(null);

  /* pointer-driven tilt: ±11° rotateY, ±8° rotateX, eased by CSS transition */
  const onPointerMove = (e: React.PointerEvent) => {
    if (!interactive || e.pointerType === "touch") return;
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: Math.max(-8, Math.min(8, -py * 16)), y: Math.max(-11, Math.min(11, px * 22)) });
  };
  const onPointerLeave = () => setTilt(null);

  const hovering = interactive && tilt !== null;
  const src = priority ? "/logo-badge-512.png" : "/logo-badge-256.png";

  return (
    <span
      ref={wrapRef}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={
        hovering
          ? ({ "--tiltX": `${tilt.x}deg`, "--tiltY": `${tilt.y}deg` } as React.CSSProperties)
          : undefined
      }
      className={cn(
        "relative inline-block shrink-0",
        animated && "emblem-float",
        animated && floorShadow && "emblem-floor",
        interactive && (hovering ? "emblem-interactive emblem-hovering" : "emblem-idle"),
        className
      )}
      role="img"
      aria-label="MOKHTAR GYM"
    >
      {/* warm gold ambience behind the coin */}
      <span aria-hidden className="emblem-glow" />

      {/* the spinning coin — front + mirrored-back faces */}
      <span className="emblem-3d">
        <img
          src={src}
          alt=""
          width={256}
          height={256}
          draggable={false}
          decoding="async"
          className="emblem-face emblem-img"
        />
        <img
          src={src}
          alt=""
          width={256}
          height={256}
          draggable={false}
          decoding="async"
          aria-hidden
          className="emblem-face emblem-face-back emblem-img"
        />
      </span>

      {/* specular sweep that sells the 3D metallic feel */}
      <span aria-hidden className={cn("emblem-sheen", animated && "emblem-sheen-run")} />

      {/* floor shadow, synced to the bob */}
      {animated && floorShadow && <span aria-hidden className="emblem-shadow" />}
    </span>
  );
}

/** Full horizontal lockup: badge + wordmark */
export function BrandLockup({
  className,
  emblemClassName,
  showTagline = true,
}: {
  className?: string;
  emblemClassName?: string;
  showTagline?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <GymEmblem className={cn("h-12 w-12", emblemClassName)} />
      <div className="flex flex-col leading-none">
        <span className="font-display text-xl font-black tracking-[0.08em] gold-text">
          MOKHTAR GYM
        </span>
        {showTagline && (
          <span className="mt-1.5 text-[10px] font-semibold tracking-[0.42em] text-neutral-500">
            FITNESS CLUB
          </span>
        )}
      </div>
    </div>
  );
}
