import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { OffersAdminClient } from "@/components/admin/offers-client";

export const dynamic = "force-dynamic";

export default async function AdminOffersPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const offers = await db.offer.findMany({
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <OffersAdminClient
      offers={offers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        planId: o.planId,
        planNameAr: o.plan?.nameAr ?? null,
        planNameFr: o.plan?.nameFr ?? null,
        planNameEn: o.plan?.nameEn ?? null,
        originalPrice: o.originalPrice,
        offerPrice: o.offerPrice,
        startDate: o.startDate.toISOString(),
        endDate: o.endDate.toISOString(),
        status: o.status,
      }))}
      plans={(await db.membershipPlan.findMany({ where: { status: "ACTIVE" } })).map((p) => ({
        id: p.id,
        nameEn: p.nameEn,
        price: p.price,
      }))}
    />
  );
}
