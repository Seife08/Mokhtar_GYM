import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AnnouncementsAdminClient } from "@/components/admin/announcements-client";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const admin = await requireAdmin();
  if (!admin) return null;
  const { new: isNew } = await searchParams;

  const announcements = await db.announcement.findMany({
    orderBy: [{ priority: "desc" }, { startDate: "desc" }],
    take: 30,
  });

  return (
    <AnnouncementsAdminClient
      openNew={isNew === "1"}
      announcements={announcements.map((a) => ({
        id: a.id,
        title: a.title,
        body: a.body,
        priority: a.priority,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate?.toISOString() ?? null,
        status: a.status,
      }))}
    />
  );
}
