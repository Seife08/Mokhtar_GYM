import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { OffersClient } from "@/components/client/offers-client";
import { AnnouncementsClient } from "@/components/client/announcements-client";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Offers" };
}

export default async function OffersPage() {
  const me = await requireClient();
  if (!me) return null;

  const now = new Date();
  const offers = await db.offer.findMany({
    where: { status: "ACTIVE", endDate: { gte: now }, startDate: { lte: now } },
    include: { plan: true },
    orderBy: { endDate: "asc" },
  });

  return (
    <OffersClient
      offers={offers.map((o) => ({
        id: o.id,
        title: o.title,
        description: o.description,
        originalPrice: o.originalPrice,
        offerPrice: o.offerPrice,
        endDate: o.endDate.toISOString(),
        planNameEn: o.plan?.nameEn ?? null,
        planNameAr: o.plan?.nameAr ?? null,
        planNameFr: o.plan?.nameFr ?? null,
      }))}
    />
  );
}
