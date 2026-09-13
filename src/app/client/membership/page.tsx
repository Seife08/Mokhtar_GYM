import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { latestMembership, membershipStatus, daysRemaining, membershipProgress } from "@/lib/membership";
import { MembershipClient } from "@/components/client/membership-client";

export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const me = await requireClient();
  if (!me) return null;

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const expiringDays = settings?.expiringSoonDays ?? 7;

  const [memberships, payments] = await Promise.all([
    db.membership.findMany({
      where: { userId: me.id },
      include: { plan: true },
      orderBy: { startDate: "desc" },
    }),
    db.payment.findMany({
      where: { userId: me.id },
      orderBy: { paidAt: "desc" },
    }),
  ]);

  const current = latestMembership(memberships, expiringDays, settings?.gracePeriodDays ?? 0);

  const serialize = (m: (typeof memberships)[number]) => ({
    id: m.id,
    planName: m.plan.nameEn,
    planNameAr: m.plan.nameAr,
    planNameFr: m.plan.nameFr,
    startDate: m.startDate.toISOString(),
    endDate: m.endDate.toISOString(),
    pricePaid: m.pricePaid,
    status: membershipStatus(m, expiringDays, settings?.gracePeriodDays ?? 0),
    remainingDays: daysRemaining(m),
    progress: membershipProgress(m),
    paused: m.status === "PAUSED",
  });

  return (
    <MembershipClient
      current={current ? serialize(current.m) : null}
      history={memberships.filter((m) => m.id !== current?.m.id).map(serialize)}
      payments={payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt.toISOString(),
        reference: p.reference,
      }))}
    />
  );
}
