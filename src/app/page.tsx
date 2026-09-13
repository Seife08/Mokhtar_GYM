"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SplashScreen } from "@/components/brand/splash";
import { GymEmblem } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";

export default function RootPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [splashDone, setSplashDone] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // only show full splash on fresh visit (session storage flag).
  // Syncing with external storage after mount avoids a hydration mismatch.
  useEffect(() => {
    if (sessionStorage.getItem("mg_splash_seen")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShowSplash(false);
       
      setSplashDone(true);
    }
  }, []);

  const handleDone = () => {
    sessionStorage.setItem("mg_splash_seen", "1");
    setSplashDone(true);
  };

  const go = (path: string) => router.push(path);

  return (
    <main className="brand-bg grid-texture relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
      {showSplash && <SplashScreen onDone={handleDone} />}

      {/* ambient orbs */}
      <div className="pointer-events-none absolute -top-24 h-72 w-72 rounded-full bg-primary/[0.05] blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-[#B8860B]/[0.06] blur-3xl" />

      {splashDone && (
        <motion.div
          className="relative z-10 flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <GymEmblem className="h-24 w-24" priority interactive floorShadow />
          <h1 className="font-display mt-6 text-4xl font-black tracking-[0.1em] gold-text md:text-5xl">
            MOKHTAR GYM
          </h1>
          <p className="mt-3 text-[11px] font-semibold tracking-[0.45em] text-neutral-500">
            {t("common.tagline")}
          </p>

          <div className="mt-12 flex w-full max-w-xs flex-col gap-3">
            <Button
              size="lg"
              onClick={() => go("/login")}
              className="h-12 rounded-xl bg-primary text-[13px] font-extrabold tracking-wider text-black shadow-[0_8px_30px_-8px_rgba(245,196,0,0.45)] transition-all hover:bg-[#ffd700] active:scale-[0.98]"
            >
              {t("common.login")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => go("/register")}
              className="h-12 rounded-xl border-neutral-700 bg-transparent text-[13px] font-extrabold tracking-wider text-neutral-200 transition-all hover:border-primary/60 hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
            >
              {t("common.joinUs")}
            </Button>
          </div>

          <p className="mt-10 max-w-md text-xs leading-relaxed text-neutral-600">
            {t("auth.landingUnified")}
          </p>
        </motion.div>
      )}
    </main>
  );
}
