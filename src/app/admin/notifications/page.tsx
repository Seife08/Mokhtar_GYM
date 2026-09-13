import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { NotificationsAdminClient } from "@/components/admin/notifications-client";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const [clients, recentSent] = await Promise.all([
    db.user.findMany({
      where: { role: "CLIENT", status: "ACTIVE" },
      select: { id: true, firstName: true, lastName: true },
      orderBy: { firstName: "asc" },
    }),
    db.notification.findMany({
      where: { type: "general" },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  return (
    <NotificationsAdminClient
      clients={clients.map((c) => ({
        id: c.id,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim(),
      }))}
      recent={recentSent.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        to: `${n.user.firstName ?? ""} ${n.user.lastName ?? ""}`.trim(),
        createdAt: n.createdAt.toISOString(),
      }))}
    />
  );
}
