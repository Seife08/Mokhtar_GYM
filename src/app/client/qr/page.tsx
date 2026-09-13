import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { latestMembership, membershipStatus } from "@/lib/membership";
import { QrPage as QrPageClient } from "@/components/client/qr-client";

export const dynamic = "force-dynamic";

export default async function ClientQrPage() {
  const me = await requireClient();
  if (!me) return null;

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const memberships = await db.membership.findMany({
    where: { userId: me.id },
    include: { plan: true },
    orderBy: { startDate: "desc" },
  });
  const current = latestMembership(memberships, settings?.expiringSoonDays ?? 7, settings?.gracePeriodDays ?? 0);

  return (
    <QrPageClient
      name={`${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || "—"}
      status={
        current
          ? (membershipStatus(current.m, settings?.expiringSoonDays ?? 7, settings?.gracePeriodDays ?? 0) as string)
          : "NONE"
      }
      qrToken={me.qrToken}
    />
  );
}
