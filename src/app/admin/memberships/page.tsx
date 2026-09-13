import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { membershipStatus, daysRemaining } from "@/lib/membership";
import { MembershipsClient } from "@/components/admin/memberships-client";

export const dynamic = "force-dynamic";

export default async function AdminMembershipsPage({
  searchParams,
}: {
  searchParams: Promise<{ member?: string; status?: string; page?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { member, status, page } = await searchParams;

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const expDays = settings?.expiringSoonDays ?? 7;

  const where: Record<string, unknown> = {};
  if (member) where.userId = member;

  const all = await db.membership.findMany({
    where,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
      plan: true,
    },
    orderBy: { startDate: "desc" },
  });

  const enriched = all.map((m) => ({
    id: m.id,
    memberId: m.user.id,
    memberName: `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim(),
    planNameAr: m.plan.nameAr,
    planNameFr: m.plan.nameFr,
    planNameEn: m.plan.nameEn,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
    pricePaid: m.pricePaid,
    status: membershipStatus(m, expDays, 0),
    rawStatus: m.status,
    remainingDays: daysRemaining(m),
  }));

  const filtered =
    status === "active"
      ? enriched.filter((e) => e.status === "ACTIVE" || e.status === "EXPIRING_SOON")
      : status === "expiring"
        ? enriched.filter((e) => e.status === "EXPIRING_SOON")
        : status === "expired"
          ? enriched.filter((e) => e.status === "EXPIRED")
          : status === "paused"
            ? enriched.filter((e) => e.status === "PAUSED")
            : status === "cancelled"
              ? enriched.filter((e) => e.status === "CANCELLED" || e.rawStatus === "CANCELLED")
              : enriched;

  const PAGE = 15;
  const pageNum = Math.max(1, Number(page) || 1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));

  const [plans, clients] = await Promise.all([
    db.membershipPlan.findMany({ where: { status: "ACTIVE" }, orderBy: { sortOrder: "asc" } }),
    db.user.findMany({
      where: { role: "CLIENT", status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  return (
    <MembershipsClient
      memberships={filtered.slice((pageNum - 1) * PAGE, pageNum * PAGE)}
      pageCount={pageCount}
      pageNum={pageNum}
      totalCount={filtered.length}
      filter={status ?? "all"}
      presetMember={member ?? null}
      plans={plans.map((p) => ({ id: p.id, nameEn: p.nameEn, nameAr: p.nameAr, nameFr: p.nameFr, price: p.price, durationDays: p.durationDays }))}
      clients={clients.map((c) => ({
        id: c.id,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      }))}
    />
  );
}
