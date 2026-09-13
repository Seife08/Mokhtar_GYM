import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ClassesAdminClient } from "@/components/admin/classes-client";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const now = new Date();
  const [upcoming, past] = await Promise.all([
    db.fitnessClass.findMany({
      where: { date: { gte: now } },
      include: {
        _count: { select: { bookings: { where: { status: "BOOKED" } } } },
        bookings: {
          where: { status: "BOOKED" },
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { bookedAt: "asc" },
        },
      },
      orderBy: { date: "asc" },
    }),
    db.fitnessClass.findMany({
      where: { date: { lt: now } },
      include: { _count: { select: { bookings: { where: { status: "BOOKED" } } } } },
      orderBy: { date: "desc" },
      take: 15,
    }),
  ]);

  return (
    <ClassesAdminClient
      upcoming={upcoming.map((c) => ({
        id: c.id,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        nameFr: c.nameFr,
        date: c.date.toISOString(),
        durationMin: c.durationMin,
        capacity: c.capacity,
        booked: c._count.bookings,
        instructor: c.instructor,
        status: c.status,
        attendees: c.bookings.map((b) => ({
          id: b.user.id,
          name: `${b.user.firstName ?? ""} ${b.user.lastName ?? ""}`.trim(),
        })),
      }))}
      past={past.map((c) => ({
        id: c.id,
        nameEn: c.nameEn,
        nameAr: c.nameAr,
        nameFr: c.nameFr,
        date: c.date.toISOString(),
        booked: c._count.bookings,
        status: c.status,
      }))}
    />
  );
}
