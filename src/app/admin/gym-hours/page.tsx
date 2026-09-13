import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { GymHoursClient } from "@/components/admin/gym-hours-client";

export const dynamic = "force-dynamic";

export default async function AdminGymHoursPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const schedules = await db.gymSchedule.findMany({
    include: { slots: { orderBy: { order: "asc" } } },
  });

  const shaped = schedules.map((s) => ({
    gender: s.gender as "MALE" | "FEMALE",
    dayOfWeek: s.dayOfWeek,
    isOpen: s.isOpen,
    note: s.note,
    slots: s.slots.map((sl) => ({
      startMin: sl.startMin,
      endMin: sl.endMin,
      label: sl.label,
    })),
  }));

  return <GymHoursClient initial={shaped} />;
}
