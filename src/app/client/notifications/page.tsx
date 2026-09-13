import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { NotificationsClient } from "@/components/client/notifications-client";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const me = await requireClient();
  if (!me) return null;

  const notifications = await db.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return (
    <NotificationsClient
      notifications={notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
