"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Home,
  Dumbbell,
  TrendingUp,
  BadgeCheck,
  User,
  Bell,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { cn } from "@/lib/utils";
import { GymEmblem } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/brand/theme-toggle";

interface ShellUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  language: string;
  onboarding: boolean;
}

const NAV: { href: string; icon: React.ElementType; key: DictKey }[] = [
  { href: "/client", icon: Home, key: "nav.home" },
  { href: "/client/workouts", icon: Dumbbell, key: "nav.workouts" },
  { href: "/client/progress", icon: TrendingUp, key: "nav.progress" },
  { href: "/client/membership", icon: BadgeCheck, key: "nav.membership" },
  { href: "/client/profile", icon: User, key: "nav.profile" },
];

export function ClientShell({
  user,
  unreadCount,
  gymPhone,
  children,
}: {
  user: ShellUser;
  unreadCount: number;
  gymPhone: string | null;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const reduce = useReducedMotion();

  // onboarding gate
  useEffect(() => {
    if (!user.onboarding && pathname !== "/client") {
      router.replace("/onboarding");
    }
  }, [user.onboarding, pathname, router]);

  const isActive = (href: string) =>
    href === "/client" ? pathname === "/client" : pathname.startsWith(href);

  const initial = (user.firstName?.[0] ?? user.lastName?.[0] ?? "M").toUpperCase();

  return (
    <div className="brand-bg flex min-h-dvh flex-col">
      {/* ===== top bar ===== */}
      <header className="surface-glass sticky top-0 z-40 border-b border-border/60">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <Link href="/client/profile" className="flex items-center gap-2.5">

            {user.avatar ? (

              <img
                src={user.avatar}
                alt=""
                className="h-9 w-9 rounded-full border border-primary/30 object-cover"
              />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-primary/30 bg-[#151515] text-[13px] font-bold text-primary">
                {initial}
              </span>
            )}
            <GymEmblem className="h-8 w-8" />
            <span className="font-display text-[13px] font-bold tracking-[0.06em] gold-text">
              MOKHTAR GYM
            </span>
          </Link>

          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/client/notifications"
              aria-label={t("notifs.title")}
              className="relative flex h-10 w-10 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/5 hover:text-primary"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute end-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-black">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* ===== page content ===== */}
      {/*
        NOTE: no AnimatePresence here on purpose. The segment <template>
        (RouteTemplate) already runs the arrival animation on every
        navigation; wrapping children again in a mode="wait" presence
        used to make the page WAIT for the exit (0.18s) before showing
        new content — that double animation was the main reason the app
        felt heavy. One fast animation beats two chained ones.
      */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 pt-4">{children}</main>

      {/* ===== bottom navigation ===== */}
      <nav
        aria-label="Primary"
        className="surface-glass fixed inset-x-0 bottom-0 z-40 border-t border-border/60 pb-safe"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className="relative flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-1.5"
              >
                {/* sliding gold pill behind the active item */}
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="nav-pill"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 480, damping: 38, mass: 0.9 }
                    }
                  />
                )}

                <motion.span
                  animate={
                    reduce
                      ? {}
                      : active
                        ? { y: -2, scale: 1.12 }
                        : { y: 0, scale: 1 }
                  }
                  whileTap={reduce ? {} : { scale: 0.82 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className="flex items-center justify-center"
                >
                  <Icon
                    className={cn(
                      "h-5.5 w-5.5 transition-colors",
                      active ? "text-primary" : "text-neutral-500"
                    )}
                    strokeWidth={active ? 2.2 : 1.8}
                  />
                </motion.span>
                <span
                  className={cn(
                    "relative text-[10px] font-bold tracking-wide transition-colors duration-200",
                    active ? "text-primary" : "text-neutral-600"
                  )}
                >
                  {t(item.key)}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
