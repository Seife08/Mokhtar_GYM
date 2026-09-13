import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();
  // admin vanished mid-session — hard sign-out instead of a /login loop
  if (!admin) redirect("/api/auth/logout");

  const alerts = await db.notification.findMany({
    where: { userId: admin.id, isRead: false },
    take: 1,
  });

  return (
    <AdminShell
      adminName={`${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() || admin.email}
      adminAvatar={admin.avatar}
      unreadAlerts={alerts.length > 0}
    >
      {children}
    </AdminShell>
  );
}
