import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { PlansClient } from "@/components/admin/plans-client";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const plans = await db.membershipPlan.findMany({
    include: { _count: { select: { memberships: { where: { status: "ACTIVE" } } } } },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <PlansClient
      plans={plans.map((p) => ({
        id: p.id,
        nameEn: p.nameEn,
        nameAr: p.nameAr,
        nameFr: p.nameFr,
        descriptionEn: p.descriptionEn,
        descriptionAr: p.descriptionAr,
        descriptionFr: p.descriptionFr,
        features: p.features,
        durationDays: p.durationDays,
        price: p.price,
        status: p.status,
        activeMemberships: p._count.memberships,
      }))}
    />
  );
}
