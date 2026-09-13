import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { GymInfoClient } from "@/components/client/gym-info-client";

export const dynamic = "force-dynamic";

export default async function GymInfoPage() {
  const me = await requireClient();
  if (!me) return null;

  const [gym, schedules] = await Promise.all([
    db.gymSettings.findUnique({ where: { id: "main" } }),
    db.gymSchedule.findMany({
      include: { slots: { orderBy: { order: "asc" } } },
      orderBy: [{ gender: "asc" }, { dayOfWeek: "asc" }],
    }),
  ]);

  return (
    <GymInfoClient
      gym={{
        gymName: gym?.gymName ?? "MOKHTAR GYM",
        phone: gym?.phone ?? null,
        whatsapp: gym?.whatsapp ?? null,
        address: gym?.address ?? null,
        mapsUrl: gym?.mapsUrl ?? null,
        hours: gym?.hours ?? null,
        facebook: gym?.facebook ?? null,
        instagram: gym?.instagram ?? null,
        tiktok: gym?.tiktok ?? null,
      }}
      schedules={schedules.map((s) => ({
        gender: s.gender as "MALE" | "FEMALE",
        dayOfWeek: s.dayOfWeek,
        isOpen: s.isOpen,
        note: s.note,
        slots: s.slots.map((sl) => ({
          startMin: sl.startMin,
          endMin: sl.endMin,
          label: sl.label,
        })),
      }))}
    />
  );
}
