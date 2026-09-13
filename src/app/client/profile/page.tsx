import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { latestMembership, membershipStatus } from "@/lib/membership";
import { ProfileClient } from "@/components/client/profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const me = await requireClient();
  if (!me) return null;

  const settings = await db.gymSettings.findUnique({ where: { id: "main" } });
  const memberships = await db.membership.findMany({
    where: { userId: me.id },
    include: { plan: true },
    orderBy: { startDate: "desc" },
  });
  const current = latestMembership(memberships, settings?.expiringSoonDays ?? 7, 0);

  return (
    <ProfileClient
      user={{
        firstName: me.firstName,
        lastName: me.lastName,
        email: me.email,
        phone: me.phone,
        dob: me.dob?.toISOString() ?? null,
        gender: me.gender,
        avatar: me.avatar,
        language: me.language,
        createdAt: me.createdAt.toISOString(),
      }}
      membershipStatus={
        current
          ? membershipStatus(current.m, settings?.expiringSoonDays ?? 7, 0)
          : "NONE"
      }
      planName={
        current
          ? { nameAr: current.m.plan.nameAr, nameFr: current.m.plan.nameFr, nameEn: current.m.plan.nameEn }
          : null
      }
    />
  );
}
