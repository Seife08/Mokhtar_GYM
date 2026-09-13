import type { Membership } from "@/generated/prisma/client";

export type MembershipStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "PAUSED"
  | "CANCELLED";

export interface MembershipLike {
  status: string;
  endDate: Date;
  pausedAt?: Date | null;
}

/**
 * Compute effective membership status with configurable thresholds.
 * PAUSED/CANCELLED are explicit; otherwise derived from dates.
 */
export function membershipStatus(
  m: MembershipLike,
  expiringSoonDays = 7,
  graceDays = 0,
  now: Date = new Date()
): MembershipStatus {
  if (m.status === "PAUSED") return "PAUSED";
  if (m.status === "CANCELLED") return "CANCELLED";

  const end = new Date(m.endDate);
  // effective end date + grace
  const effectiveEnd = new Date(end);
  effectiveEnd.setDate(effectiveEnd.getDate() + graceDays);

  if (now > effectiveEnd) return "EXPIRED";
  if (m.status === "EXPIRED") return "EXPIRED";

  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= expiringSoonDays) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function daysRemaining(m: MembershipLike, now: Date = new Date()): number {
  const end = new Date(m.endDate);
  const diffMs = end.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/** Which plan progress (0-100) has been consumed */
export function membershipProgress(m: { startDate: Date; endDate: Date }): number {
  const start = new Date(m.startDate).getTime();
  const end = new Date(m.endDate).getTime();
  const now = Date.now();
  if (now >= end) return 100;
  if (now <= start) return 0;
  return Math.round(((now - start) / (end - start)) * 100);
}

/** Pick the latest ACTIVE/EXPIRING_SOON membership for a user given their memberships */
export function latestMembership(
  memberships: Membership[],
  expiringSoonDays = 7,
  graceDays = 0
): { m: Membership; status: MembershipStatus } | null {
  const relevant = memberships
    .filter((m) => m.status === "ACTIVE" || m.status === "PAUSED")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  const current = relevant[0];
  if (!current) {
    // fall back to latest any-status membership for display
    const latestAny = memberships.sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    )[0];
    if (!latestAny) return null;
    return {
      m: latestAny,
      status: membershipStatus(latestAny, expiringSoonDays, graceDays),
    };
  }
  return {
    m: current,
    status: membershipStatus(current, expiringSoonDays, graceDays),
  };
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Attendance streak in days (consecutive days ending today/yesterday) */
export function attendanceStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(
    dates.map((d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
    })
  );
  const keys = [...days];
  // convert back to sortable
  const dayKeys = keys
    .map((k) => {
      const [y, m, d] = k.split("-").map(Number);
      return { y, m, d, key: k };
    })
    .sort((a, b) => (a.y - b.y) || (a.m - b.m) || (a.d - b.d));

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const fmt = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  // streak must include today or yesterday
  let cursor: Date;
  if (dayKeys.some((k) => k.key === fmt(today))) cursor = today;
  else if (dayKeys.some((k) => k.key === fmt(yesterday))) cursor = yesterday;
  else return 0;

  while (dayKeys.some((k) => k.key === fmt(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
