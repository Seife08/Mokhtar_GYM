import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { AnnouncementsClient } from "@/components/client/announcements-client";

export const dynamic = "force-dynamic";

export default async function AnnouncementsPage() {
  const me = await requireClient();
  if (!me) return null;

  const announcements = await db.announcement.findMany({
    where: { status: "PUBLISHED", startDate: { lte: new Date() } },
    orderBy: [{ priority: "desc" }, { startDate: "desc" }],
    take: 30,
  });

  return (
    <AnnouncementsClient
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        priority: a.priority,
        startDate: a.startDate.toISOString(),
      }))}
    />
  );
}
