"use client";

import * as React from "react";
import {
  Building2,
  SlidersHorizontal,
  Globe2,
  Save,
  CheckCircle2,
  UserCog,
  Mail,
  KeyRound,
  Camera,
  Loader2,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { Field, SubmitButton, PasswordField } from "@/components/brand/field";
import { saveSettingsAction } from "@/server-actions/admin-content";
import { updateAdminAccountAction } from "@/server-actions/admin-account";
import { useMgAction } from "@/lib/use-mg-action";
import { AvatarPicker } from "@/components/brand/avatar-picker";
import { toast } from "sonner";

export function SettingsClient({
  admin,
  settings,
}: {
  admin: {
    firstName: string;
    lastName: string;
    email: string;
    avatar: string | null;
  };
  settings: {
    gymName: string;
    phone: string;
    whatsapp: string;
    address: string;
    mapsUrl: string;
    hours: string;
    facebook: string;
    instagram: string;
    tiktok: string;
    defaultLang: string;
    currency: string;
    timezone: string;
    expiringSoonDays: number;
    gracePeriodDays: number;
    doubleCheckinMins: number;
    cancelWindowHours: number;
  };
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useMgAction(saveSettingsAction, {
    onSuccess: () => toast.success(t("admin.settingsSaved")),
    onError: (res) => toast.error(t(res.error as never)),
  });

  return (
    <div className="space-y-5">
      <h1 className="font-display text-[24px] font-black tracking-tight text-neutral-50">
        {t("admin.settings")}
      </h1>

      <AccountSection admin={admin} />

      <form action={formAction} className="space-y-5">
        {/* ===== gym info ===== */}
        <section className="surface-card rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            <Building2 className="h-4 w-4 text-primary" />
            {t("admin.gymSettings")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="st-name" name="gymName" label={t("admin.gymName")} defaultValue={settings.gymName} required />
            <Field id="st-hours" name="hours" label={t("admin.openingHours")} defaultValue={settings.hours} />
            <Field id="st-phone" name="phone" label={t("admin.phone")} defaultValue={settings.phone} dir="ltr" />
            <Field id="st-wa" name="whatsapp" label={t("admin.whatsapp")} defaultValue={settings.whatsapp} dir="ltr" />
            <Field id="st-address" name="address" label={t("gym.address")} defaultValue={settings.address} />
            <Field id="st-maps" name="mapsUrl" label={t("admin.mapsUrl")} defaultValue={settings.mapsUrl} dir="ltr" />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Field id="st-fb" name="facebook" label="Facebook" defaultValue={settings.facebook} dir="ltr" />
            <Field id="st-ig" name="instagram" label="Instagram" defaultValue={settings.instagram} dir="ltr" />
            <Field id="st-tt" name="tiktok" label="TikTok" defaultValue={settings.tiktok} dir="ltr" />
          </div>
        </section>

        {/* ===== business rules ===== */}
        <section className="surface-card rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            {t("admin.membershipSettings")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field
              id="st-expiring"
              name="expiringSoonDays"
              type="number"
              min="1"
              max="30"
              label={t("admin.expiringSoonDays")}
              defaultValue={settings.expiringSoonDays}
              dir="ltr"
            />
            <Field
              id="st-grace"
              name="gracePeriodDays"
              type="number"
              min="0"
              max="30"
              label={t("admin.gracePeriod")}
              defaultValue={settings.gracePeriodDays}
              dir="ltr"
            />
            <Field
              id="st-double"
              name="doubleCheckinMins"
              type="number"
              min="0"
              max="1440"
              label={t("admin.doubleCheckin")}
              defaultValue={settings.doubleCheckinMins}
              dir="ltr"
            />
            <Field
              id="st-cancel"
              name="cancelWindowHours"
              type="number"
              min="0"
              max="48"
              label={t("admin.cancelWindow")}
              defaultValue={settings.cancelWindowHours}
              dir="ltr"
            />
          </div>
          <p className="mt-3 text-[11px] text-neutral-600">{t("admin.pauseNote")}</p>
        </section>

        {/* ===== localization ===== */}
        <section className="surface-card rounded-2xl p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
            <Globe2 className="h-4 w-4 text-primary" />
            {t("admin.localization")}
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Field id="st-lang" name="defaultLang" label={t("admin.defaultLanguage")}>
              <select id="st-lang" name="defaultLang" defaultValue={settings.defaultLang} className="input-premium h-11 rounded-lg bg-transparent text-[14px] text-neutral-100">
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </Field>
            <Field id="st-currency" name="currency" label={t("common.currency")} defaultValue={settings.currency} dir="ltr" />
            <Field id="st-tz" name="timezone" label={t("admin.timezone")} defaultValue={settings.timezone} dir="ltr" />
          </div>
        </section>

        {state?.ok && (
          <p className="flex items-center gap-2 text-[13px] font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" />
            {t("admin.settingsSaved")}
          </p>
        )}

        <SubmitButton pending={pending}>
          <span className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {t("common.save")}
          </span>
        </SubmitButton>
      </form>
    </div>
  );
}

/* ================= admin account ================= */
function AccountSection({
  admin,
}: {
  admin: { firstName: string; lastName: string; email: string; avatar: string | null };
}) {
  const { t } = useI18n();
  const [accountState, accountAction, accountPending] = useMgAction(
    updateAdminAccountAction,
    {
      onSuccess: () => toast.success(t("admin.accountSaved")),
      onError: (res) => toast.error(t(res.error as never)),
    }
  );

  /* live avatar preview — mirrors the client profile page pattern.
     hidden field: data URL = new photo · "__remove__" = delete · "" = keep */
  const [avatar, setAvatar] = React.useState<string | null>(admin.avatar);
  const [avatarDirty, setAvatarDirty] = React.useState(false);
  const avatarFieldValue = avatar ?? (avatarDirty ? "__remove__" : "");

  const onAvatarChange = (v: string | null) => {
    setAvatar(v);
    setAvatarDirty(true);
  };

  return (
    <form action={accountAction} className="surface-card rounded-2xl p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
        <UserCog className="h-4 w-4 text-primary" />
        {t("admin.accountSection")}
      </h2>
      <p className="mb-4 text-[12px] text-neutral-600">{t("admin.accountDesc")}</p>

      <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* avatar column */}
        <div className="flex flex-col items-center gap-3">
          <input type="hidden" name="avatar" value={avatarFieldValue} />
          <AvatarPicker value={avatar} onChange={onAvatarChange} size={104} />
          {admin.avatar && avatar !== null && (
            <button
              type="button"
              onClick={() => onAvatarChange(null)}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 transition-colors hover:text-danger"
            >
              <Camera className="h-3.5 w-3.5" />
              {t("profile.removePhoto")}
            </button>
          )}
        </div>

        {/* fields column */}
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="acc-first"
              name="firstName"
              label={t("admin.firstName")}
              defaultValue={admin.firstName}
            />
            <Field
              id="acc-last"
              name="lastName"
              label={t("admin.lastName")}
              defaultValue={admin.lastName}
            />
          </div>

          <div>
            <Field
              id="acc-email"
              name="email"
              type="email"
              label={t("common.email")}
              defaultValue={admin.email}
              dir="ltr"
              required
            />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-neutral-600">
              <Mail className="h-3 w-3" />
              {t("admin.emailHint")}
            </p>
          </div>

          {/* password block */}
          <div className="rounded-xl border border-[#242424] bg-[#0E0E0E] p-4">
            <p className="mb-3 flex items-center gap-2 text-[11px] font-black tracking-[0.14em] text-neutral-500 uppercase">
              <KeyRound className="h-3.5 w-3.5 text-primary/70" />
              {t("common.password")}
            </p>
            <div className="grid gap-3.5 sm:grid-cols-3">
              <PasswordField
                id="acc-current"
                name="currentPassword"
                label={t("admin.currentPassword")}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <PasswordField
                id="acc-new"
                name="newPassword"
                label={t("admin.newPassword")}
                placeholder="••••••••"
                autoComplete="new-password"
              />
              <PasswordField
                id="acc-confirm"
                name="confirmPassword"
                label={t("admin.confirmPassword")}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-neutral-600">
              {t("admin.passwordHint")}
            </p>
          </div>

          {accountState && !accountState.ok && accountState.error && (
            <p className="text-[12.5px] font-semibold text-destructive">
              {t(accountState.error as never)}
            </p>
          )}

          <SubmitButton pending={accountPending}>
            <span className="flex items-center gap-2">
              {accountPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("common.save")}
            </span>
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
