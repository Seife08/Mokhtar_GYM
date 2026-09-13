"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  IdCard,
  Layers,
  CreditCard,
  ScanLine,
  Dumbbell,
  AppWindow,
  Salad,
  CalendarClock,
  CalendarCheck,
  Clock,
  Tag,
  Megaphone,
  Bell,
  FileBarChart,
  Settings2,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { GymEmblem } from "@/components/brand/logo";
import { LanguageSwitcher } from "@/components/brand/language-switcher";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { logoutAction } from "@/server-actions/auth";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ElementType;
  key: DictKey;
}

const MAIN: NavItem[] = [
  { href: "/admin", icon: LayoutDashboard, key: "admin.dashboard" },
  { href: "/admin/members", icon: Users, key: "admin.members" },
  { href: "/admin/memberships", icon: IdCard, key: "admin.memberships" },
  { href: "/admin/plans", icon: Layers, key: "admin.plans" },
  { href: "/admin/payments", icon: CreditCard, key: "admin.payments" },
  { href: "/admin/attendance", icon: ScanLine, key: "admin.attendance" },
];

const MANAGEMENT: NavItem[] = [
  { href: "/admin/workouts", icon: Dumbbell, key: "admin.workouts" },
  { href: "/admin/exercises", icon: AppWindow, key: "admin.exercises" },
  { href: "/admin/diet-plans", icon: Salad, key: "admin.dietPlans" },
  { href: "/admin/classes", icon: CalendarClock, key: "admin.classes" },
  { href: "/admin/bookings", icon: CalendarCheck, key: "admin.bookings" },
  { href: "/admin/gym-hours", icon: Clock, key: "admin.gymHours" },
];

const COMMUNICATION: NavItem[] = [
  { href: "/admin/offers", icon: Tag, key: "admin.offers" },
  { href: "/admin/announcements", icon: Megaphone, key: "admin.announcements" },
  { href: "/admin/notifications", icon: Bell, key: "admin.notifications" },
  { href: "/admin/reports", icon: FileBarChart, key: "admin.reports" },
];

function NavLink({
  item,
  active,
  collapsed,
  onNavigate,
  showDot,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  showDot?: boolean;
}) {
  const { t } = useI18n();
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? t(item.key) : undefined}
      className={cn(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200",
        collapsed && "justify-center px-0"
      )}
    >
      {active && (
        <motion.span
          layoutId="admin-nav-indicator"
          className="absolute inset-y-1 start-0 w-[3px] rounded-full bg-primary"
          transition={{ type: "spring", stiffness: 400, damping: 32 }}
        />
      )}
      <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
      {!collapsed && <span className="truncate">{t(item.key)}</span>}
      {showDot && !collapsed && <span className="ms-auto h-2 w-2 rounded-full bg-danger" />}
    </Link>
  );
}

function NavList({
  items,
  pathname,
  collapsed,
  onNavigate,
  unreadAlerts,
}: {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  unreadAlerts: boolean;
}) {
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isActive(item.href)}
          collapsed={collapsed}
          onNavigate={onNavigate}
          showDot={unreadAlerts && item.href === "/admin/notifications"}
        />
      ))}
    </>
  );
}

function Sections({
  pathname,
  collapsed,
  onNavigate,
  unreadAlerts,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  unreadAlerts: boolean;
}) {
  const { t } = useI18n();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-black tracking-[0.2em] text-neutral-700 uppercase">
          {t("admin.mainMenu")}
        </p>
      )}
      <div className="space-y-1">
        <NavList items={MAIN} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} unreadAlerts={unreadAlerts} />
      </div>
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-black tracking-[0.2em] text-neutral-700 uppercase">
          {t("admin.management")}
        </p>
      )}
      <div className="space-y-1">
        <NavList items={MANAGEMENT} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} unreadAlerts={unreadAlerts} />
      </div>
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-black tracking-[0.2em] text-neutral-700 uppercase">
          {t("admin.communication")}
        </p>
      )}
      <div className="space-y-1">
        <NavList items={COMMUNICATION} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} unreadAlerts={unreadAlerts} />
      </div>
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-black tracking-[0.2em] text-neutral-700 uppercase">
          {t("admin.system")}
        </p>
      )}
      <div className="space-y-1">
        <Link
          href="/admin/settings"
          onClick={onNavigate}
          title={collapsed ? t("admin.settings") : undefined}
          className={cn(
            "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors",
            isActive("/admin/settings")
              ? "bg-primary/10 text-primary"
              : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200",
            collapsed && "justify-center px-0"
          )}
        >
          <Settings2 className="h-4.5 w-4.5 shrink-0" />
          {!collapsed && <span>{t("admin.settings")}</span>}
        </Link>
      </div>
    </nav>
  );
}

export function AdminShell({
  adminName,
  adminAvatar,
  unreadAlerts,
  children,
}: {
  adminName: string;
  adminAvatar?: string | null;
  unreadAlerts: boolean;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);

  const logout = async () => {
    setLogoutPending(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-[#080808]" dir="ltr">
      {/* ===== desktop sidebar ===== */}
      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-40 hidden flex-col border-e border-[#151515] bg-[#0b0b0b] transition-[width] duration-300 lg:flex",
          collapsed ? "w-[68px]" : "w-[248px]"
        )}
      >
        {/* logo */}
        <div className={cn("flex h-16 items-center border-b border-[#151515] px-4", collapsed && "justify-center px-0")}>
          <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
            <GymEmblem className="h-9 w-9 shrink-0" />
            {!collapsed && (
              <div className="leading-none">
                <div className="font-display text-[14px] font-black tracking-[0.08em] gold-text whitespace-nowrap">
                  MOKHTAR GYM
                </div>
                <div className="mt-1 text-[8px] font-bold tracking-[0.3em] text-neutral-700 uppercase">
                  {t("admin.dashboard")}
                </div>
              </div>
            )}
          </Link>
        </div>

        <Sections
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={() => setMobileOpen(false)}
          unreadAlerts={unreadAlerts}
        />

        {/* footer */}
        <div className="space-y-2 border-t border-[#151515] p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? t("admin.expandSidebar") : t("admin.collapseSidebar")}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-lg text-neutral-500 transition-colors hover:bg-white/[0.04] hover:text-neutral-300"
          >
            {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
            {!collapsed && <span className="text-[12px] font-semibold">{t("admin.collapseSidebar")}</span>}
          </button>
          {!collapsed && (
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              {adminAvatar ? (
                <img
                  src={adminAvatar}
                  alt={adminName}
                  className="h-8 w-8 shrink-0 rounded-lg border border-primary/25 object-cover"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-[12px] font-black text-primary">
                  {adminName.charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-bold text-neutral-300">{adminName}</p>
                <p className="text-[10px] text-neutral-600">ADMIN</p>
              </div>
              <button
                onClick={logout}
                disabled={logoutPending}
                aria-label={t("common.logout")}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-600 transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ===== mobile top bar ===== */}
      <div className="surface-glass sticky top-0 z-40 flex h-14 items-center justify-between border-b border-[#151515] px-4 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label={t("admin.mainMenu")}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-300"
        >
          <Menu className="h-5.5 w-5.5" />
        </button>
        <div className="flex items-center gap-2.5">
          <GymEmblem className="h-7 w-7" />
          <span className="font-display text-[13px] font-black tracking-[0.08em] gold-text">
            MOKHTAR GYM
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle className="h-10 w-10" />
          <LanguageSwitcher />
        </div>
      </div>

      {/* ===== mobile drawer ===== */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/70 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 34 }}
              className="fixed inset-y-0 start-0 z-50 flex w-[272px] flex-col border-e border-[#151515] bg-[#0b0b0b] lg:hidden"
            >
              <div className="flex h-14 items-center justify-between border-b border-[#151515] px-4">
                <div className="flex items-center gap-2.5">
                  <GymEmblem className="h-8 w-8" />
                  <span className="font-display text-[13px] font-black tracking-[0.08em] gold-text">
                    MOKHTAR GYM
                  </span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  aria-label={t("common.close")}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Sections
                pathname={pathname}
                collapsed={false}
                onNavigate={() => setMobileOpen(false)}
                unreadAlerts={unreadAlerts}
              />
              <div className="border-t border-[#151515] p-3">
                <button
                  onClick={logout}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-danger/30 bg-danger/5 text-[12px] font-bold text-danger"
                >
                  <LogOut className="h-4 w-4" />
                  {t("common.logout")}
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== content ===== */}
      <div className={cn("transition-[padding] duration-300", collapsed ? "lg:ps-[68px]" : "lg:ps-[248px]")}>
        {/* desktop utility bar */}
        <div className="hidden items-center justify-end border-b border-[#151515] px-6 py-2.5 lg:flex">
          <ThemeToggle />
          <LanguageSwitcher />
        </div>
        <main className="p-4 sm:p-6 lg:p-7" dir="auto">
          {children}
        </main>
      </div>
    </div>
  );
}
