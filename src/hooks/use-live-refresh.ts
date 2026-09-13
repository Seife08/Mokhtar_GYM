"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * useLiveRefresh — keeps a page's server data in step with the outside
 * world (NFC check-ins, scans, payments…) by calling router.refresh()
 * on an interval. Pauses automatically when the tab is hidden so it
 * never burns battery in a background tab.
 */
export function useLiveRefresh(ms: number = 30_000) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, ms);
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, ms]);
}
