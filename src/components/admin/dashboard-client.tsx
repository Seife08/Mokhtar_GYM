"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useLiveRefresh } from "@/hooks/use-live-refresh";
import {
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ScanLine,
  CreditCard,
  Banknote,
  UserPlus,
  IdCard,
  Dumbbell,
  Megaphone,
  ArrowUpRight,
  ChevronRight,
  Bell,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useI18n, type DictKey } from "@/i18n";
import { cn } from "@/lib/utils";

const GOLD = "#F5C400";
const GOLD_DEEP = "#B8860B";
const GOLD_DARK = "#6B5B1E";
const NEUTRAL = "#8A8A8A";
const PIE_COLORS = ["#F5C400", "#B8860B", "#6B5B1E", "#8A6500", "#57542A", "#A98A2E"];

interface Stats {
  totalMembers: number;
  activeMembers: number;
  expiredCount: number;
  expiringSoon: number;
  noMembership: number;
  todayAttendance: number;
  inGymNow: number;
  todayRevenue: number;
  monthlyRevenue: number;
  activePrograms: number;
  newBookings: number;
  paymentsToday: number;
  expiredToday: number;
}

const QUICK: { href: string; icon: React.ElementType; key: DictKey }[] = [
  { href: "/admin/members?new=1", icon: UserPlus, key: "admin.addClient" },
  { href: "/admin/payments?new=1", icon: CreditCard, key: "admin.recordPayment" },
  { href: "/admin/attendance", icon: ScanLine, key: "admin.scanQr" },
  { href: "/admin/memberships", icon: IdCard, key: "admin.createMembership" },
  { href: "/admin/workouts", icon: Dumbbell, key: "admin.createWorkout" },
  { href: "/admin/announcements?new=1", icon: Megaphone, key: "admin.createAnnouncement" },
];

export function DashboardClient({
  stats,
  revenueSeries,
  attendanceSeries,
  growthSeries,
  planDistribution,
  recentPayments,
  recentMembers,
}: {
  stats: Stats;
  revenueSeries: { date: string; value: number }[];
  attendanceSeries: { date: string; value: number }[];
  growthSeries: { date: string; value: number }[];
  planDistribution: { name: string; value: number }[];
  recentPayments: { id: string; name: string; amount: number; method: string; time: string }[];
  recentMembers: { id: string; name: string; createdAt: string }[];
}) {
  const { t, fmtMoney, fmtTime, fmtDate, locale } = useI18n();

  /* keep stats live: member NFC/QR check-ins land here in real time */
  useLiveRefresh(20_000);

  const prevGrowth = growthSeries[growthSeries.length - 2]?.value ?? 0;
  const growthDelta = stats.totalMembers - prevGrowth;

  const tooltipStyle = {
    background: "#161616",
    border: "1px solid rgba(245,196,0,0.25)",
    borderRadius: 10,
    fontSize: 12,
    color: "#f5f5f5",
  } as const;

  return (
    <div className="space-y-6" dir="auto">
      {/* ===== header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
            {t("admin.dashboard")}
          </h1>
          <p className="mt-0.5 text-[12px] text-neutral-500">
            {fmtDate(new Date(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* ===== stat cards ===== */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={t("admin.totalMembers")} value={stats.totalMembers} icon={Users} accent="gold" delay={0} sub={`${growthDelta >= 0 ? "+" : ""}${growthDelta} ${t("admin.vsPrev")}`} />
        <StatCard label={t("admin.activeMembers")} value={stats.activeMembers} icon={CheckCircle2} accent="success" delay={0.04} />
        <StatCard label={t("admin.expiringSoonCount")} value={stats.expiringSoon} icon={AlertTriangle} accent="warning" delay={0.08} href="/admin/members?filter=expiring" />
        <StatCard label={t("admin.expiredCount")} value={stats.expiredCount + stats.noMembership} icon={XCircle} accent="danger" delay={0.12} href="/admin/members?filter=expired" />
        <StatCard label={t("admin.todaysAttendance")} value={stats.todayAttendance} icon={ScanLine} accent="gold" delay={0.16} sub={`${stats.inGymNow} ${t("admin.inGymNow")}`} href="/admin/attendance" />
        <StatCard label={t("admin.todaysRevenue")} value={fmtMoney(stats.todayRevenue)} icon={Banknote} accent="gold" delay={0.2} />
      </div>

      {/* ===== quick actions — control-deck tiles ===== */}
      <section>
        <div className="mb-3 flex items-center gap-3.5">
          <h2 className="text-[11px] font-black tracking-[0.2em] text-neutral-600 uppercase">
            {t("admin.quickActions")}
          </h2>
          <span
            aria-hidden
            className="h-px flex-1 bg-[linear-gradient(90deg,#2A2716,transparent)] rtl:bg-[linear-gradient(270deg,#2A2716,transparent)]"
          />
          <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-neutral-700">
            {String(QUICK.length).padStart(2, "0")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {QUICK.map((q, i) => (
            <motion.div
              key={q.href}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.035, duration: 0.25 }}
            >
              <Link href={q.href} className="cmd-tile group">
                <span aria-hidden className="cmd-bracket" />
                {/* top row: engraved index + corner arrow */}
                <span className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-primary/55 tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <ArrowUpRight aria-hidden className="cmd-arrow h-4 w-4 text-neutral-600" strokeWidth={2.2} />
                </span>
                {/* bottom row: icon chip + label */}
                <span className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#2E2A1A] bg-[#161616] shadow-[inset_0_1px_0_rgba(255,255,255,.04)] transition-colors duration-200 group-hover:border-primary/40 group-hover:bg-[#1C1810]">
                    <q.icon className="h-4 w-4 text-neutral-500 transition-colors duration-200 group-hover:text-primary" strokeWidth={1.9} />
                  </span>
                  <span className="min-w-0 text-[11.5px] font-bold leading-tight text-neutral-300 transition-colors duration-200 group-hover:text-neutral-50">
                    {t(q.key)}
                  </span>
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ===== alerts ===== */}
      {(stats.expiringSoon > 0 || stats.expiredToday > 0 || stats.paymentsToday > 0 || stats.newBookings > 0) && (
        <section className="grid gap-2.5 md:grid-cols-2">
          <AlertRow
            icon={AlertTriangle}
            text={t("admin.expiringSoonList", { n: stats.expiringSoon })}
            href="/admin/members?filter=expiring"
            tone="warning"
          />
          <AlertRow icon={Bell} text={t("admin.expiredToday", { n: stats.expiredToday })} href="/admin/members?filter=expired" tone="danger" />
          <AlertRow icon={CreditCard} text={t("admin.paymentsToday", { n: stats.paymentsToday })} href="/admin/payments" tone="success" />
          <AlertRow icon={Dumbbell} text={t("admin.newBookings", { n: stats.newBookings })} href="/admin/bookings" tone="neutral" />
        </section>
      )}

      {/* ===== charts ===== */}
      <div className="grid gap-5 xl:grid-cols-3">
        {/* revenue */}
        <ChartCard title={t("admin.revenueChart")} className="xl:col-span-2" subtitle={t("admin.last30")}>
          <div className="h-[240px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueSeries} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="goldArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1c1c1c" vertical={false} />
                <XAxis dataKey="date" stroke="#525252" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={{ stroke: "#262626" }} interval="keep" minTickGap={28} />
                <YAxis stroke="#525252" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={{ stroke: "#262626" }} width={48} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmtMoney(Number(v)), ""]} labelStyle={{ color: "#a3a3a3" }} />
                <Area type="monotone" dataKey="value" stroke={GOLD} strokeWidth={2.2} fill="url(#goldArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[12px] font-bold text-neutral-500">
            {t("admin.monthlyRevenue")}: <span className="text-primary">{fmtMoney(stats.monthlyRevenue)}</span>
          </p>
        </ChartCard>

        {/* plan distribution */}
        <ChartCard title={t("admin.planDistribution")}>
          {planDistribution.length > 0 ? (
            <div className="flex h-[240px] flex-col items-center justify-center" dir="ltr">
              <ResponsiveContainer width="70%" height="75%">
                <PieChart>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Pie
                    data={planDistribution}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="88%"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {planDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {planDistribution.map((p, i) => (
                  <span key={p.name} className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400">
                    <span className="h-2 w-2 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    {p.name} ({p.value})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center text-[12px] text-neutral-600">
              {t("admin.noChange")}
            </div>
          )}
        </ChartCard>

        {/* attendance */}
        <ChartCard title={t("admin.attendanceChart")} className="xl:col-span-2" subtitle={t("admin.last7")}>
          <div className="h-[220px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceSeries.slice(-7)} margin={{ top: 5, right: 10, bottom: 0, left: -14 }}>
                <CartesianGrid stroke="#1c1c1c" vertical={false} />
                <XAxis dataKey="date" stroke="#525252" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={{ stroke: "#262626" }} />
                <YAxis stroke="#525252" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={{ stroke: "#262626" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(245,196,0,0.06)" }} />
                <Bar dataKey="value" fill={GOLD_DEEP} radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* member growth */}
        <ChartCard title={t("admin.memberGrowth")}>
          <div className="h-[220px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthSeries} margin={{ top: 5, right: 10, bottom: 0, left: -14 }}>
                <defs>
                  <linearGradient id="growthArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD_DEEP} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={GOLD_DEEP} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1c1c1c" vertical={false} />
                <XAxis dataKey="date" stroke="#525252" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={{ stroke: "#262626" }} />
                <YAxis stroke="#525252" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={{ stroke: "#262626" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="value" stroke={GOLD_DEEP} strokeWidth={2.2} fill="url(#growthArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* ===== recent lists ===== */}
      <div className="grid gap-5 lg:grid-cols-2">
        <ListCard title={t("admin.recentPayments")} href="/admin/payments">
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-[12px] text-neutral-600">{t("admin.noPayments")}</p>
          ) : (
            recentPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-[#1a1a1a] py-2.5 last:border-0">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-neutral-200">{p.name}</p>
                  <p className="text-[10.5px] text-neutral-600">{fmtTime(p.time)}</p>
                </div>
                <div className="text-end">
                  <p className="text-[13px] font-black text-primary tabular-nums">{fmtMoney(p.amount)}</p>
                  <p className="text-[10px] text-neutral-600">{t(methodKey(p.method))}</p>
                </div>
              </div>
            ))
          )}
        </ListCard>

        <ListCard title={t("admin.recentMembers")} href="/admin/members">
          {recentMembers.map((m) => (
            <Link key={m.id} href={`/admin/members/${m.id}`} className="flex items-center justify-between border-b border-[#1a1a1a] py-2.5 last:border-0 transition-colors hover:bg-white/[0.02]">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1a1a1a] text-[11px] font-black text-primary">
                  {m.name.charAt(0)}
                </span>
                <p className="truncate text-[13px] font-semibold text-neutral-200">{m.name}</p>
              </div>
              <span className="shrink-0 text-[10.5px] text-neutral-600">{fmtDate(m.createdAt)}</span>
            </Link>
          ))}
        </ListCard>
      </div>
    </div>
  );
}

function methodKey(m: string): DictKey {
  const map: Record<string, DictKey> = {
    CASH: "admin.cash",
    CCP: "admin.ccp",
    BARIDIMOB: "admin.baridimob",
    BANK: "admin.bank",
    ONLINE: "admin.online",
    OTHER: "admin.other",
  };
  return map[m] ?? "admin.other";
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  href,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: "gold" | "success" | "warning" | "danger";
  sub?: string;
  href?: string;
  delay: number;
}) {
  const accentColor = {
    gold: "text-primary",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[accent];
  const borderColor = {
    gold: "border-primary/20",
    success: "border-success/20",
    warning: "border-warning/20",
    danger: "border-danger/20",
  }[accent];

  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={cn("surface-card rounded-xl p-4 transition-colors", href && "hover:bg-[#181818]")}
    >
      <div className="flex items-center justify-between">
        <p className="text-[9.5px] font-black tracking-[0.14em] text-neutral-500 uppercase">{label}</p>
        <Icon className={cn("h-4 w-4", accentColor)} />
      </div>
      <p className={cn("font-display mt-2 text-[22px] font-black tabular-nums leading-none", accentColor)}>
        {value}
      </p>
      {sub && <p className="mt-1.5 text-[10px] text-neutral-600">{sub}</p>}
    </motion.div>
  );

  return href ? (
    <Link href={href} className={cn("block rounded-xl border border-transparent transition-colors hover:border", borderColor)}>
      {inner}
    </Link>
  ) : (
    inner
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-card rounded-2xl p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">{title}</h3>
        {subtitle && <span className="text-[10px] font-semibold text-neutral-600">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function ListCard({
  title,
  href,
  children,
}: {
  title: string;
  href: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="surface-card rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">{title}</h3>
        <Link href={href} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
          {t("home.viewAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="divide-y divide-[#1a1a1a]">{children}</div>
    </div>
  );
}

function AlertRow({
  icon: Icon,
  text,
  href,
  tone,
}: {
  icon: React.ElementType;
  text: string;
  href: string;
  tone: "warning" | "danger" | "success" | "neutral";
}) {
  const colors = {
    warning: "border-warning/25 bg-warning/[0.05] text-warning",
    danger: "border-danger/25 bg-danger/[0.05] text-danger",
    success: "border-success/25 bg-success/[0.05] text-success",
    neutral: "border-neutral-700 bg-[#141414] text-neutral-300",
  }[tone];
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-200 hover:bg-white/[.03]",
        colors
      )}
    >
      <Icon className="h-4.5 w-4.5 shrink-0" />
      <p className="flex-1 text-[13px] font-semibold">{text}</p>
      <ChevronRight
        className="h-4 w-4 opacity-50 transition-[opacity,translate] duration-200 group-hover:translate-x-0.5 group-hover:opacity-90 rtl-flip rtl:group-hover:-translate-x-0.5"
      />
    </Link>
  );
}
