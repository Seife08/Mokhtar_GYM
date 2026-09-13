import { redirect } from "next/navigation";
import { requireClient } from "@/lib/auth";
import { CheckinClient } from "@/components/client/checkin-client";

export const dynamic = "force-dynamic";

/**
 * NFC entry point — this URL is written onto the NFC tag at the gym door.
 * When a member taps their phone on the reader, Android opens this page
 * and the check-in fires automatically (attendance + timestamp merge into
 * the admin dashboard in real time). Top-level route on purpose: the page
 * must render WITHOUT the app shell (full-screen gate UX).
 */
export default async function CheckinPage() {
  const me = await requireClient();
  if (!me) redirect("/login?next=/checkin");

  return (
    <CheckinClient
      name={`${me.firstName ?? ""} ${me.lastName ?? ""}`.trim() || me.email}
      avatar={me.avatar}
    />
  );
}
