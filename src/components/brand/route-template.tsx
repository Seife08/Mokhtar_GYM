"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Segment route transition — professional and cheap:
 * · every navigation remounts the segment <template>, so the new page
 *   enters with ONE restrained GPU-only move: fade + 10px rise, 240ms
 * · no exit animation — the previous page is already unmounted, so
 *   nothing ever blocks a click or delays content (UX-safe)
 * · a slim gold progress rail sweeps once at the top on arrival
 *   (pure CSS, rendered OUTSIDE the animated subtree so fixed
 *   positioning is never affected by the temporary transform)
 * · `prefers-reduced-motion` disables all of it
 *
 * IMPORTANT: this template only wraps PAGE content. The app shells
 * (sidebars, bottom navs — position:fixed) live in the segment layout,
 * ABOVE this component, so they never jitter during the transition.
 */
export function RouteTemplate({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();

  return (
    <>
      {!reduce && <div aria-hidden className="route-progress" />}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.21, 0.6, 0.35, 1] }}
      >
        {children}
      </motion.div>
    </>
  );
}
