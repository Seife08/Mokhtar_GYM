import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { BookingsAdminClient } from "@/components/admin/bookings-client";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const now = new Date();
  const [upcoming, history] = await Promise.all([
    db.booking.findMany({
      where: { fitnessClass: { date: { gte: now } }, status: "BOOKED" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        fitnessClass: true,
      },
      orderBy: { fitnessClass: { date: "asc" } },
    }),
    db.booking.findMany({
      where: { OR: [{ status: "CANCELLED" }, { fitnessClass: { date: { lt: now } } }] },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        fitnessClass: true,
      },
      orderBy: { fitnessClass: { date: "desc" } },
      take: 30,
    }),
  ]);

  const serialize = (b: (typeof upcoming)[number]) => ({
    id: b.id,
    memberId: b.user.id,
    memberName: `${b.user.firstName ?? ""} ${b.user.lastName ?? ""}`.trim(),
    classNameAr: b.fitnessClass.nameAr,
    classNameFr: b.fitnessClass.nameFr,
    classNameEn: b.fitnessClass.nameEn,
    date: b.fitnessClass.date.toISOString(),
    status: b.status,
    bookedAt: b.bookedAt.toISOString(),
  });

  return <BookingsAdminClient upcoming={upcoming.map(serialize)} history={history.map(serialize)} />;
}
