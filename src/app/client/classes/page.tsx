import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { ClassesClient } from "@/components/client/classes-client";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const me = await requireClient();
  if (!me) return null;

  const now = new Date();
  const classes = await db.fitnessClass.findMany({
    where: { date: { gte: now }, status: "SCHEDULED" },
    include: {
      bookings: { where: { status: "BOOKED" } },
      _count: { select: { bookings: { where: { status: "BOOKED" } } } },
    },
    orderBy: { date: "asc" },
    take: 30,
  });

  const myBookings = await db.booking.findMany({
    where: { userId: me.id, status: "BOOKED" },
    include: { fitnessClass: true },
    orderBy: { fitnessClass: { date: "asc" } },
  });
  const myBookedClassIds = new Set(myBookings.map((b) => b.fitnessClass.id));

  return (
    <ClassesClient
      classes={classes.map((c) => ({
        id: c.id,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        nameFr: c.nameFr,
        date: c.date.toISOString(),
        durationMin: c.durationMin,
        capacity: c.capacity,
        booked: c._count.bookings,
        instructor: c.instructor,
        isBooked: myBookedClassIds.has(c.id),
        myBookingId: myBookings.find((b) => b.fitnessClassId === c.id)?.id ?? null,
      }))}
    />
  );
}
