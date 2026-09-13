"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GymEmblem } from "./logo";

/**
 * Premium splash: black canvas, ambient gold light,
 * emblem materializes with metallic sheen, settles, exits.
 * Duration budget: ~1.8s, only on first mount.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      onDone?.();
    }, 1800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#080808]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: [0.21, 0.6, 0.35, 1] }}
        >
          {/* ambient gold glow */}
          <motion.div
            className="absolute h-[420px] w-[420px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(245,196,0,0.10) 0%, transparent 62%)",
            }}
            initial={{ opacity: 0, scale: 0.55 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          />

          {/* emblem: rise + subtle 3D settle */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 16, scale: 0.92, rotateX: 14 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            transition={{ duration: 0.95, ease: [0.21, 0.6, 0.35, 1], delay: 0.18 }}
          >
            {/* metallic sheen sweep */}
            <motion.div
              className="absolute inset-0 overflow-hidden rounded-full"
              aria-hidden
            >
              <motion.div
                className="absolute -inset-y-8 w-16"
                style={{
                  background:
                    "linear-gradient(100deg, transparent 0%, rgba(255,224,102,0.28) 45%, rgba(255,224,102,0.4) 50%, rgba(255,224,102,0.28) 55%, transparent 100%)",
                  filter: "blur(6px)",
                }}
                initial={{ x: "-160%" }}
                animate={{ x: "260%" }}
                transition={{ duration: 1.05, delay: 0.72, ease: "easeInOut" }}
              />
            </motion.div>
            <GymEmblem className="h-28 w-28 md:h-32 md:w-32" priority floorShadow />
          </motion.div>

          {/* wordmark */}
          <motion.div
            className="mt-7 flex flex-col items-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.66, ease: "easeOut" }}
          >
            <span className="font-display text-[26px] font-black tracking-[0.14em] gold-text md:text-3xl">
              MOKHTAR GYM
            </span>
            <motion.span
              className="mt-2.5 text-[10px] font-semibold tracking-[0.5em] text-neutral-500"
              initial={{ letterSpacing: "0.2em", opacity: 0 }}
              animate={{ letterSpacing: "0.5em", opacity: 1 }}
              transition={{ duration: 0.9, delay: 0.9 }}
            >
              FITNESS CLUB
            </motion.span>
          </motion.div>

          {/* loading bar */}
          <motion.div
            className="absolute bottom-28 h-[2px] w-40 overflow-hidden rounded-full bg-neutral-900"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            <motion.div
              className="h-full"
              style={{
                background: "linear-gradient(90deg, #8A6500, #F5C400, #FFE066)",
              }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.35, delay: 0.45, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
