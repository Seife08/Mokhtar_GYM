import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireClient } from "@/lib/auth";
import { SettingsClient } from "@/components/client/settings-client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const me = await requireClient();
  if (!me) redirect("/api/auth/logout");

  return <SettingsClient user={{ firstName: me.firstName, lastName: me.lastName, email: me.email, avatar: me.avatar }} />;
}
