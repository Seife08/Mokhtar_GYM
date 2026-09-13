import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { BookingsClient } from "@/components/client/bookings-client";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
  const me = await requireClient();
  if (!me) return null;

  const bookings = await db.booking.findMany({
    where: { userId: me.id, status: "BOOKED" },
    include: { fitnessClass: true },
    orderBy: { fitnessClass: { date: "asc" } },
  });

  return (
    <BookingsClient
      bookings={bookings.map((b) => ({
        id: b.id,
        nameEn: b.fitnessClass.nameEn,
        nameAr: b.fitnessClass.nameAr,
        nameFr: b.fitnessClass.nameFr,
        date: b.fitnessClass.date.toISOString(),
        durationMin: b.fitnessClass.durationMin,
        instructor: b.fitnessClass.instructor,
        status: b.fitnessClass.status,
      }))}
    />
  );
}
