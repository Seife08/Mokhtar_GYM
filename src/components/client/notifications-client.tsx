"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  CreditCard,
  Dumbbell,
  Salad,
  Users2,
  Megaphone,
  Tag,
  Bell,
  CheckCheck,
  Inbox,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { PageHeader, EmptyState } from "./ui";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/server-actions/client";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, { icon: React.ElementType; key: DictKey; color: string }> = {
  membership: { icon: BadgeCheck, key: "notifs.type.membership", color: "text-primary" },
  payment: { icon: CreditCard, key: "notifs.type.payment", color: "text-success" },
  workout: { icon: Dumbbell, key: "notifs.type.workout", color: "text-warning" },
  diet: { icon: Salad, key: "notifs.type.diet", color: "text-success" },
  class: { icon: Users2, key: "notifs.type.class", color: "text-info" },
  announcement: { icon: Megaphone, key: "notifs.type.announcement", color: "text-neutral-400" },
  offer: { icon: Tag, key: "notifs.type.offer", color: "text-primary" },
  general: { icon: Bell, key: "notifs.type.general", color: "text-neutral-400" },
};

interface NItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsClient({ notifications }: { notifications: NItem[] }) {
  const { t, fmtDateTime } = useI18n();
  const [items, setItems] = useState(notifications);
  const [expanded, setExpanded] = useState<string | null>(null);

  const unread = items.filter((n) => !n.isRead).length;

  const markRead = async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    await markNotificationReadAction(id);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsReadAction();
  };

  return (
    <div>
      <PageHeader title={t("notifs.title")}>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-neutral-800 px-3 text-[11px] font-bold text-neutral-400 transition-colors hover:border-primary/40 hover:text-primary"
          >
            <CheckCheck className="h-4 w-4" />
            <span className="hidden sm:inline">{t("notifs.markAllRead")}</span>
          </button>
        )}
      </PageHeader>

      {unread > 0 && (
        <p className="mb-3 text-[12px] font-semibold text-primary">
          {t("notifs.unread", { n: unread })}
        </p>
      )}

      {items.length === 0 ? (
        <EmptyState icon={Inbox} title={t("notifs.none")} desc={t("notifs.noneDesc")} />
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((n) => {
              const conf = TYPE_ICON[n.type] ?? TYPE_ICON.general;
              const Icon = conf.icon;
              const isOpen = expanded === n.id;
              return (
                <motion.div
                  layout
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={cn(
                    "surface-card rounded-xl transition-colors",
                    !n.isRead && "border-primary/25 bg-primary/[0.04]"
                  )}
                >
                  <button
                    onClick={() => {
                      setExpanded(isOpen ? null : n.id);
                      if (!n.isRead) markRead(n.id);
                    }}
                    className="flex w-full items-start gap-3 p-4 text-start"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                        n.isRead ? "bg-[#151515]" : "bg-primary/10"
                      )}
                    >
                      <Icon className={cn("h-5 w-5", n.isRead ? "text-neutral-600" : conf.color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-[13.5px]",
                            n.isRead ? "font-medium text-neutral-400" : "font-bold text-neutral-100"
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </div>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-600">
                        {t(conf.key)} · {fmtDateTime(n.createdAt)}
                      </p>
                      {isOpen && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-2 text-[12.5px] leading-relaxed text-neutral-400"
                        >
                          {n.body}
                        </motion.p>
                      )}
                    </div>
                  </button>
                  {isOpen && n.link && (
                    <Link
                      href={n.link}
                      className="mx-4 mb-3.5 flex h-9 items-center justify-center rounded-lg bg-primary/10 text-[11.5px] font-bold text-primary transition-colors hover:bg-primary/20"
                    >
                      {t("common.view")}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
