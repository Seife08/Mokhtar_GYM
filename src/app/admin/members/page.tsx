import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { membershipStatus, daysRemaining } from "@/lib/membership";
import { MembersClient } from "@/components/admin/members-client";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string; new?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { q, filter, page, new: isNew } = await searchParams;

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const expDays = settings?.expiringSoonDays ?? 7;

  // fetch all clients with memberships (OK at this scale; indexed queries for large sets)
  const where: Record<string, unknown> = {
    role: "CLIENT",
    status: { not: "DELETED" },
  };
  if (q) {
    where.OR = [
      { firstName: { contains: q } },
      { lastName: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { id: { contains: q } },
    ];
  }

  const clients = await db.user.findMany({
    where,
    include: {
      memberships: { where: { status: { in: ["ACTIVE", "PAUSED"] } }, include: { plan: true }, orderBy: { startDate: "desc" }, take: 1 },
      attendances: { orderBy: { checkInAt: "desc" }, take: 1, select: { checkInAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // compute status and filter
  const enriched = clients.map((c) => {
    const m = c.memberships[0];
    const status = m ? membershipStatus(m, expDays, 0) : "NONE";
    return {
      id: c.id,
      firstName: c.firstName ?? "",
      lastName: c.lastName ?? "",
      email: c.email,
      phone: c.phone,
      avatar: c.avatar,
      accountStatus: c.status,
      membershipStatus: status,
      planName: m?.plan.nameEn ?? null,
      planNameAr: m?.plan.nameAr ?? null,
      planNameFr: m?.plan.nameFr ?? null,
      remainingDays: m ? daysRemaining(m) : 0,
      endDate: m?.endDate.toISOString() ?? null,
      lastVisit: c.attendances[0]?.checkInAt?.toISOString() ?? null,
    };
  });

  const filtered =
    filter === "active"
      ? enriched.filter((e) => e.membershipStatus === "ACTIVE" || e.membershipStatus === "EXPIRING_SOON")
      : filter === "expiring"
        ? enriched.filter((e) => e.membershipStatus === "EXPIRING_SOON")
        : filter === "expired"
          ? enriched.filter((e) => e.membershipStatus === "EXPIRED" || e.membershipStatus === "NONE")
          : filter === "paused"
            ? enriched.filter((e) => e.membershipStatus === "PAUSED")
            : filter === "inactive"
              ? enriched.filter((e) => e.accountStatus === "INACTIVE")
              : enriched;

  const pageNum = Math.max(1, Number(page) || 1);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((pageNum - 1) * PAGE_SIZE, pageNum * PAGE_SIZE);

  const plans = await db.membershipPlan.findMany({
    where: { status: "ACTIVE" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <MembersClient
      members={pageItems}
      pageCount={pageCount}
      pageNum={pageNum}
      totalCount={filtered.length}
      search={q ?? ""}
      filter={filter ?? "all"}
      openNew={isNew === "1"}
      plans={plans.map((p) => ({
        id: p.id,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        nameFr: p.nameFr,
        price: p.price,
        durationDays: p.durationDays,
      }))}
    />
  );
}
