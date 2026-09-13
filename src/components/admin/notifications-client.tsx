"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Bell, Search, Users2, UserCheck, Clock, User } from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field, SubmitButton } from "@/components/brand/field";
import { sendNotificationAction } from "@/server-actions/admin-content";
import { useMgAction } from "@/lib/use-mg-action";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const TARGETS: { v: string; key: DictKey; icon: React.ElementType; desc: string }[] = [
  { v: "ALL", key: "admin.allMembers", icon: Users2, desc: "Every active client account" },
  { v: "ACTIVE", key: "admin.activeMembers", icon: UserCheck, desc: "Clients with an active membership" },
  { v: "EXPIRING", key: "admin.expiringMembers", icon: Clock, desc: "Memberships expiring within threshold" },
  { v: "INDIVIDUAL", key: "admin.individual", icon: User, desc: "Send to one specific member" },
];

export function NotificationsAdminClient({
  clients,
  recent,
}: {
  clients: { id: string; name: string }[];
  recent: { id: string; title: string; body: string; to: string; createdAt: string }[];
}) {
  const { t, fmtDateTime } = useI18n();
  const router = useRouter();
  const [target, setTarget] = useState("ALL");
  const [memberQuery, setMemberQuery] = useState("");
  const [state, formAction, pending] = useMgAction(sendNotificationAction, {
    onSuccess: (res) => {
      toast.success(t("admin.notificationSent", { n: (res as { count?: number }).count ?? 0 }));
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });

  const filteredClients = memberQuery
    ? clients.filter((c) => c.name.toLowerCase().includes(memberQuery.toLowerCase())).slice(0, 8)
    : clients.slice(0, 8);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
        {t("admin.notifications")}
      </h1>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* ===== composer ===== */}
        <form action={formAction} className="surface-card space-y-4 rounded-2xl p-5 lg:col-span-3">
          <h2 className="flex items-center gap-2 text-[12px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            <Send className="h-4 w-4 text-primary" />
            {t("admin.sendNotification")}
          </h2>

          {/* target selector */}
          <div>
            <p className="mb-2 text-[13px] font-semibold text-neutral-300">{t("admin.target")}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TARGETS.map((tg) => (
                <button
                  key={tg.v}
                  type="button"
                  onClick={() => setTarget(tg.v)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                    target === tg.v
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-neutral-800 text-neutral-400 hover:border-neutral-600"
                  )}
                >
                  <tg.icon className="h-5 w-5" />
                  <span className="text-center text-[11px] font-bold leading-tight">{t(tg.key)}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="target" value={target} />
          </div>

          {/* individual member picker */}
          {target === "INDIVIDUAL" && (
            <div className="space-y-2">
              <label className="text-[13px] font-semibold text-neutral-300">{t("admin.selectMember")}</label>
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-600" />
                <input
                  value={memberQuery}
                  onChange={(e) => setMemberQuery(e.target.value)}
                  placeholder={t("common.search")}
                  className="input-premium h-11 w-full rounded-lg ps-10 pe-4 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
                />
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg border border-[#262626]">
                {filteredClients.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2.5 border-b border-[#1a1a1a] p-2.5 text-[13px] last:border-0 hover:bg-primary/5"
                  >
                    <input type="radio" name="userId" value={c.id} className="accent-[#F5C400]" />
                    <span className="flex-1 truncate font-semibold text-neutral-200">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Field id="nt-title" name="title" label={t("admin.notificationTitle")} required placeholder="…" />
          <div className="space-y-1.5">
            <label className="text-[13px] font-semibold text-neutral-300" htmlFor="nt-message">
              {t("admin.message")} <span className="text-primary">*</span>
            </label>
            <textarea
              id="nt-message"
              name="message"
              rows={3}
              required
              maxLength={500}
              className="input-premium w-full rounded-lg p-3 text-[14px] text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              placeholder="…"
            />
          </div>

          {state && !state.ok && <p className="text-xs text-danger">{t(state.error as never)}</p>}
          <SubmitButton pending={pending}>
            <span className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {t("admin.sendNotification")}
            </span>
          </SubmitButton>
        </form>

        {/* ===== recent ===== */}
        <div className="surface-card rounded-2xl p-5 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-[12px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            <Bell className="h-4 w-4 text-primary" />
            {t("admin.notificationHistory")}
          </h2>
          <div className="max-h-[480px] space-y-2 overflow-y-auto">
            {recent.length === 0 && (
              <p className="py-8 text-center text-[12.5px] text-neutral-600">{t("notifs.none")}</p>
            )}
            {recent.map((n) => (
              <div key={n.id} className="rounded-xl bg-[#121212] p-3">
                <p className="text-[12.5px] font-bold text-neutral-200">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-neutral-500">{n.body}</p>
                <p className="mt-1.5 text-[10px] text-neutral-700">
                  → {n.to} · {fmtDateTime(n.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
