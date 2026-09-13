import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { ClientShell } from "@/components/client/shell";

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireClient();
  // user vanished mid-session (e.g. deleted by staff) — the cookie stays
  // "valid" for the middleware, so sign out hard instead of looping /login
  if (!me) redirect("/api/auth/logout");

  const [unreadCount, gym] = await Promise.all([
    db.notification.count({
      where: { userId: me.id, isRead: false },
    }),
    db.gymSettings.findUnique({ where: { id: "main" } }),
  ]);

  return (
    <ClientShell
      user={{
        id: me.id,
        firstName: me.firstName,
        lastName: me.lastName,
        avatar: me.avatar,
        language: me.language,
        onboarding: me.onboarding,
      }}
      unreadCount={unreadCount}
      gymPhone={gym?.phone ?? null}
    >
      {children}
    </ClientShell>
  );
}
