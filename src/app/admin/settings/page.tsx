import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { SettingsClient } from "@/components/admin/settings-client";
import { AuthSettingsSection } from "@/components/admin/auth-settings-section";
import { decryptSecret } from "@/lib/crypto-secrets";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  if (!admin) return null;

  const gym = await db.gymSettings.findUnique({ where: { id: "main" } });

  return (
    <div className="space-y-5">
      <SettingsClient
        admin={{
          firstName: admin.firstName ?? "",
          lastName: admin.lastName ?? "",
          email: admin.email,
          avatar: admin.avatar,
        }}
        settings={{
          gymName: gym?.gymName ?? "MOKHTAR GYM",
          phone: gym?.phone ?? "",
          whatsapp: gym?.whatsapp ?? "",
          address: gym?.address ?? "",
          mapsUrl: gym?.mapsUrl ?? "",
          hours: gym?.hours ?? "",
          facebook: gym?.facebook ?? "",
          instagram: gym?.instagram ?? "",
          tiktok: gym?.tiktok ?? "",
          defaultLang: gym?.defaultLang ?? "ar",
          currency: gym?.currency ?? "DZD",
          timezone: gym?.timezone ?? "Africa/Algiers",
          expiringSoonDays: gym?.expiringSoonDays ?? 7,
          gracePeriodDays: gym?.gracePeriodDays ?? 0,
          doubleCheckinMins: gym?.doubleCheckinMins ?? 120,
          cancelWindowHours: gym?.cancelWindowHours ?? 2,
        }}
      />

      {/* member sign-in: the emailed code mailbox */}
      <AuthSettingsSection
        config={{
          smtpHost: gym?.smtpHost ?? "",
          smtpPort: gym?.smtpPort ?? 587,
          smtpSecure: gym?.smtpSecure ?? true,
          smtpUser: gym?.smtpUser ?? "",
          smtpPass: decryptSecret(gym?.smtpPass) ?? "",
          smtpFrom: gym?.smtpFrom ?? "",
        }}
      />
    </div>
  );
}
