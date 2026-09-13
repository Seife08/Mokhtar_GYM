"use client";

/**
 * Client settings — now opens with the ACCOUNT block the owner asked for:
 * the member changes their profile photo, name and sign-in email at will
 * (email change keeps the session alive — the JWT is re-issued).
 */

import { useState } from "react";
import { Globe, Moon, SunMedium, Bell, CheckCircle2, Loader2, AtSign, UserRound, Camera } from "lucide-react";
import { useI18n, LOCALES, type Locale } from "@/i18n";
import { useTheme } from "@/components/theme/theme-provider";
import { updateLanguageAction, updateClientAccountAction } from "@/server-actions/client";
import { PageHeader, SectionTitle } from "@/components/client/ui";
import { AvatarPicker } from "@/components/brand/avatar-picker";
import { useMgAction } from "@/lib/use-mg-action";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const PREF_KEY = "mg_notif_prefs";

interface Prefs {
  push: boolean;
  membership: boolean;
  workout: boolean;
  classes: boolean;
  announcements: boolean;
}

const DEFAULT_PREFS: Prefs = {
  push: true,
  membership: true,
  workout: true,
  classes: true,
  announcements: true,
};

const PREF_ITEMS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "push", label: "settings.push", desc: "" },
  { key: "membership", label: "settings.membershipReminders", desc: "" },
  { key: "workout", label: "settings.workoutReminders", desc: "" },
  { key: "classes", label: "settings.classReminders", desc: "" },
  { key: "announcements", label: "settings.announcementsPref", desc: "" },
];

export interface SettingsUser {
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatar: string | null;
}

export function SettingsClient({ user }: { user: SettingsUser }) {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  /* ===== account form state ===== */
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState<string | null>(user.avatar);
  const [avatarDirty, setAvatarDirty] = useState(false);

  const [state, formAction, pending] = useMgAction(updateClientAccountAction, {
    onSuccess: () => {
      toast.success(t("account.saved"));
      setAvatarDirty(false);
      router.refresh();
    },
    onError: (res) => toast.error(t(res.error as never)),
  });

  const changeLanguage = async (l: Locale) => {
    setLocale(l);
    await updateLanguageAction(l);
    toast.success(t("settings.settingsSaved"));
  };

  const togglePref = (key: keyof Prefs) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      localStorage.setItem(PREF_KEY, JSON.stringify(next));
      return next;
    });
  };

  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      const saved = localStorage.getItem(PREF_KEY);
      return saved ? { ...DEFAULT_PREFS, ...JSON.parse(saved) } : DEFAULT_PREFS;
    } catch {
      return DEFAULT_PREFS;
    }
  });

  const emailDirty = email !== user.email;
  const nameDirty = firstName !== (user.firstName ?? "") || lastName !== (user.lastName ?? "");

  return (
    <div>
      <PageHeader title={t("settings.title")} />

      {/* ===== account ===== */}
      <section>
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-primary/70" />
            {t("account.title")}
          </span>
        </SectionTitle>
        <form action={formAction} className="surface-card rounded-2xl p-4">
          {state && !state.ok && (
            <p className="mb-3 text-xs font-medium text-danger">{t(state.error as never)}</p>
          )}

          {/* avatar */}
          <div className="flex items-center gap-4">
            <AvatarPicker
              value={avatar}
              onChange={(v) => {
                setAvatar(v);
                setAvatarDirty(v !== user.avatar);
              }}
              size={92}
            />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-neutral-200">{t("account.photo")}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                {t("account.photoHint")}
              </p>
              {avatar && (
                <button
                  type="button"
                  onClick={() => {
                    setAvatar(null);
                    setAvatarDirty(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1 rounded-lg border border-neutral-800 px-2.5 py-1 text-[10.5px] font-bold text-neutral-400 transition-colors hover:border-danger/40 hover:text-danger"
                >
                  <Camera className="h-3 w-3" />
                  {t("common.delete")}
                </button>
              )}
            </div>
          </div>

          {/* hidden avatar field — "__remove__" clears, data URL updates, empty keeps */}
          <input
            type="hidden"
            name="avatar"
            value={
              !avatarDirty ? "" : avatar === null ? "__remove__" : (avatar ?? "")
            }
          />

          {/* name */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-neutral-400">
                {t("account.firstName")}
              </span>
              <input
                name="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={2}
                maxLength={50}
                className="h-11 w-full rounded-lg border border-neutral-800 bg-[#0e0e0e] px-3.5 text-[14px] text-neutral-100 focus:border-primary/40 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11px] font-bold text-neutral-400">
                {t("account.lastName")}
              </span>
              <input
                name="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={2}
                maxLength={50}
                className="h-11 w-full rounded-lg border border-neutral-800 bg-[#0e0e0e] px-3.5 text-[14px] text-neutral-100 focus:border-primary/40 focus:outline-none"
              />
            </label>
          </div>

          {/* email */}
          <label className="mt-3 block">
            <span className="mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400">
                <AtSign className="h-3.5 w-3.5 text-primary/60" />
                {t("account.email")}
              </span>
              {emailDirty && (
                <span className="text-[9.5px] font-bold text-primary">{t("common.save")}</span>
              )}
            </span>
            <input
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              dir="ltr"
              className="h-11 w-full rounded-lg border border-neutral-800 bg-[#0e0e0e] px-3.5 text-[14px] text-neutral-100 focus:border-primary/40 focus:outline-none"
            />
            <span className="mt-1 block text-[10px] text-neutral-600">{t("account.emailHint")}</span>
          </label>

          {/* save */}
          <button
            type="submit"
            disabled={pending || (!emailDirty && !nameDirty && !avatarDirty)}
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[13px] font-extrabold tracking-wider text-black transition-all hover:bg-[#ffd700] active:scale-[0.98] disabled:opacity-40"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
            {pending ? t("common.saving") : t("account.save")}
          </button>
        </form>
      </section>

      {/* language */}
      <section className="mt-6">
        <SectionTitle>{t("settings.language")}</SectionTitle>
        <div className="surface-card rounded-2xl p-2">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => changeLanguage(l.code)}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-4 py-3.5 transition-colors",
                locale === l.code ? "bg-primary/10" : "hover:bg-white/[0.03]"
              )}
            >
              <span className="flex items-center gap-3">
                <Globe className={cn("h-4.5 w-4.5", locale === l.code ? "text-primary" : "text-neutral-600")} />
                <span
                  className={cn(
                    "text-[14px] font-bold",
                    locale === l.code ? "text-primary" : "text-neutral-300"
                  )}
                >
                  {l.label}
                </span>
              </span>
              {locale === l.code && <CheckCircle2 className="h-5 w-5 text-primary" />}
            </button>
          ))}
        </div>
      </section>

      {/* theme */}
      <section className="mt-6">
        <SectionTitle>{t("settings.theme")}</SectionTitle>
        <div className="surface-card grid grid-cols-2 gap-2 rounded-2xl p-2">
          {(
            [
              { v: "dark", label: t("settings.dark"), icon: Moon },
              { v: "light", label: t("settings.light"), icon: SunMedium },
            ] as const
          ).map((opt) => (
            <button
              key={opt.v}
              onClick={() => setTheme(opt.v)}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-xl text-[13px] font-bold transition-colors",
                theme === opt.v
                  ? "bg-primary/10 text-primary"
                  : "text-neutral-400 hover:bg-white/[0.03]"
              )}
            >
              <opt.icon className="h-4.5 w-4.5" />
              {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-2 px-1 text-[10.5px] text-neutral-600">
          {t("settings.themeHint")}
        </p>
      </section>

      {/* notification prefs */}
      <section className="mt-6">
        <SectionTitle>
          <span className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5 text-primary/70" />
            {t("settings.notifications")}
          </span>
        </SectionTitle>
        <div className="surface-card divide-y divide-neutral-800/70 rounded-2xl">
          {PREF_ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between px-4 py-3.5">
              <span className="text-[13.5px] font-semibold text-neutral-300">
                {t(item.label as never)}
              </span>
              <button
                role="switch"
                aria-checked={prefs[item.key]}
                onClick={() => togglePref(item.key)}
                className={cn(
                  "relative h-6 w-11 rounded-full transition-colors",
                  prefs[item.key] ? "bg-primary" : "bg-neutral-700"
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-5 w-5 rounded-full bg-black transition-all",
                    prefs[item.key] ? "start-[22px]" : "start-0.5"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* version footer */}
      <p className="mt-8 text-center text-[10px] font-bold tracking-[0.3em] text-neutral-800">
        MOKHTAR GYM · v1.0
      </p>
    </div>
  );
}
