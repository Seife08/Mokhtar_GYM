"use client";

import * as React from "react";
import { MailCheck, Save, Send, Check, Loader2, Wand2, Gift } from "lucide-react";
import { toast } from "sonner";
import { Field, SubmitButton } from "@/components/brand/field";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { useMgAction } from "@/lib/use-mg-action";
import {
  saveAuthSettingsAction,
  sendTestEmailAction,
} from "@/server-actions/admin-auth-settings";

/**
 * Authentication section of the admin settings — email only.
 * The whole member sign-in is the 6-digit emailed code, so the only
 * thing to wire here is the outgoing mailbox (SMTP).
 * Free one-click presets (Gmail / Brevo) pre-fill the server values,
 * and the setup guide walks the owner through the free credentials.
 * Secrets arrive decrypted (admin-only route) and re-encrypt on save.
 */

type Preset = "gmail" | "brevo";

const PRESETS: Record<
  Preset,
  { host: string; port: string; secure: boolean }
> = {
  gmail: { host: "smtp.gmail.com", port: "465", secure: true },
  brevo: { host: "smtp-relay.brevo.com", port: "587", secure: false },
};

export function AuthSettingsSection({
  config,
}: {
  config: {
    smtpHost: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string;
    smtpPass: string;
    smtpFrom: string;
  };
}) {
  const { t } = useI18n();

  const [saveState, saveAction, savePending] = useMgAction(saveAuthSettingsAction, {
    onSuccess: () => toast.success(t("admin.authSaved")),
    onError: (res) => toast.error(t(res.error as never)),
  });

  const [testState, testAction, testPending] = useMgAction(sendTestEmailAction, {
    onSuccess: () => toast.success(t("admin.testEmailSent")),
    onError: (res) => toast.error(t(res.error as never)),
  });

  const [host, setHost] = React.useState(config.smtpHost);
  const [port, setPort] = React.useState(String(config.smtpPort || 587));
  const [secure, setSecure] = React.useState(config.smtpSecure);
  const [testTo, setTestTo] = React.useState("");

  const smtpOn = !!host;

  /** Port drives the TLS mode: 465 = implicit TLS, anything else =
   *  STARTTLS. Auto-syncing the switch here (plus server-side
   *  normalization on save and in the mailer itself) makes the broken
   *  combo "SSL on port 587" impossible to persist. */
  const changePort = (value: string) => {
    setPort(value);
    setSecure(value.trim() === "465");
  };

  const applyPreset = (preset: Preset) => {
    const p = PRESETS[preset];
    setHost(p.host);
    setPort(p.port);
    setSecure(p.secure);
    toast.success(
      t("admin.presetApplied", { provider: preset === "gmail" ? "Gmail" : "Brevo" })
    );
  };

  const inputCls =
    "input-premium h-11 w-full rounded-lg text-[14px] text-neutral-100 placeholder:text-neutral-600";

  return (
    <form action={saveAction} className="surface-card rounded-2xl p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[11px] font-black tracking-[0.18em] text-neutral-500 uppercase">
        <MailCheck className="h-4 w-4 text-primary" />
        {t("admin.authSection")}
      </h2>
      <p className="mb-4 text-[12px] leading-relaxed text-neutral-600">
        {t("admin.authDesc")}
      </p>

      {/* live status chip */}
      <div className="mb-5 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
            smtpOn
              ? "border-success/30 bg-success/10 text-success"
              : "border-[#6b4f00]/40 bg-[#1c1608] text-[#F5C400]"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${smtpOn ? "bg-success" : "bg-[#F5C400] animate-pulse"}`}
          />
          {t(smtpOn ? "admin.smtpActive" : "admin.smtpDevMode")}
        </span>
      </div>

      {/* ===== SMTP ===== */}
      <div className="rounded-xl border border-[#242424] bg-[#0E0E0E] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-[11px] font-black tracking-[0.14em] text-neutral-500 uppercase">
            {t("admin.smtpSettings")}
          </p>
          {/* free presets — pre-fill server / port / SSL in one click */}
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-bold text-neutral-600">
              {t("admin.smtpPresets")}
            </span>
            <button
              type="button"
              onClick={() => applyPreset("gmail")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2e2e2e] bg-[#131313] px-2.5 py-1.5 text-[11px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Wand2 className="h-3 w-3" />
              Gmail
            </button>
            <button
              type="button"
              onClick={() => applyPreset("brevo")}
              className="inline-flex items-center gap-1.5 rounded-md border border-[#2e2e2e] bg-[#131313] px-2.5 py-1.5 text-[11px] font-bold text-neutral-300 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Wand2 className="h-3 w-3" />
              Brevo
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="st-smtp-host"
              className="text-[13px] font-semibold text-neutral-300"
            >
              {t("admin.smtpHost")}
            </label>
            <input
              id="st-smtp-host"
              name="smtpHost"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.gmail.com"
              dir="ltr"
              className={inputCls}
            />
            <p className="text-xs text-neutral-600">{t("admin.smtpHostHint")}</p>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="st-smtp-port"
              className="text-[13px] font-semibold text-neutral-300"
            >
              {t("admin.smtpPort")}
            </label>
            <input
              id="st-smtp-port"
              name="smtpPort"
              type="number"
              value={port}
              onChange={(e) => changePort(e.target.value)}
              placeholder="587"
              dir="ltr"
              className={inputCls}
            />
            <p className="text-xs text-neutral-600">
              {port.trim() === "465"
                ? t("admin.smtpModeImplicit")
                : t("admin.smtpModeStarttls")}
            </p>
          </div>
          <Field
            id="st-smtp-user"
            name="smtpUser"
            label={t("admin.smtpUser")}
            placeholder="mokhtar.gym@gmail.com"
            defaultValue={config.smtpUser}
            dir="ltr"
          />
          <Field
            id="st-smtp-pass"
            name="smtpPass"
            type="password"
            label={t("admin.smtpPass")}
            placeholder="••••••••••••"
            defaultValue={config.smtpPass}
            dir="ltr"
            hint={t("admin.smtpPassHint")}
            autoComplete="new-password"
          />
          <Field
            id="st-smtp-from"
            name="smtpFrom"
            type="email"
            label={t("admin.smtpFrom")}
            placeholder="no-reply@mokhtargym.dz"
            defaultValue={config.smtpFrom}
            dir="ltr"
            hint={t("admin.smtpFromHint")}
          />
          <input type="hidden" name="smtpSecure" value={String(secure)} />
          <div className="flex items-center justify-between rounded-lg border border-[#242424] bg-[#131313] px-4 py-3">
            <div>
              <p className="text-[13px] font-semibold text-neutral-300">
                {t("admin.smtpSecure")}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-600">
                {t("admin.smtpSecureHint")}
              </p>
            </div>
            <Switch checked={secure} onCheckedChange={setSecure} />
          </div>
        </div>

        {/* test email — separate mini form via formAction override */}
        <div className="mt-4 rounded-lg border border-[#242424] bg-[#0B0B0B] p-3.5">
          <p className="mb-2 text-[11px] font-bold tracking-wide text-neutral-500">
            {t("admin.testEmailTitle")}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="sr-only" htmlFor="testTo">
                {t("admin.testEmailTo")}
              </label>
              <input
                id="testTo"
                name="testTo"
                type="email"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={t("admin.testEmailTo")}
                dir="ltr"
                className="input-premium h-10 w-full rounded-lg bg-transparent px-3 text-[13px] text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
            <Button
              type="submit"
              formAction={testAction}
              disabled={testPending || !testTo}
              variant="outline"
              className="h-10 border-primary/30 bg-primary/5 text-[12px] font-bold text-primary hover:bg-primary/10"
            >
              {testPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {t("admin.sendTestEmail")}
            </Button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-600">
            {t("admin.testEmailAutoSave")}
          </p>
          {testState && !testState.ok && testState.error && (
            <p dir="ltr" className="mt-2 text-[12px] font-semibold text-danger">
              {t(testState.error as never)}
            </p>
          )}
          {testState?.ok && (
            <p className="mt-2 flex items-center gap-1.5 text-[12px] font-semibold text-success">
              <Check className="h-3.5 w-3.5" />
              {t("admin.testEmailSent")}
            </p>
          )}
        </div>
      </div>

      {/* ===== free setup guide ===== */}
      <div className="mt-4 rounded-xl border border-[#6b4f00]/40 bg-gradient-to-b from-[#191307] to-[#0E0E0E] p-4">
        <p className="mb-3 flex items-center gap-1.5 text-[11px] font-black tracking-[0.14em] text-[#F5C400] uppercase">
          <Gift className="h-4 w-4" />
          {t("admin.freeGuideTitle")}
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[#2e2e2e] bg-[#0B0B0B] p-3.5">
            <p className="mb-1.5 text-[12px] font-extrabold text-neutral-200">
              Gmail — {t("admin.freeGuideFree")}
            </p>
            <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-neutral-500">
              {t("admin.freeGuideGmail")}
            </p>
          </div>
          <div className="rounded-lg border border-[#2e2e2e] bg-[#0B0B0B] p-3.5">
            <p className="mb-1.5 text-[12px] font-extrabold text-neutral-200">
              Brevo — {t("admin.freeGuideFree")}
            </p>
            <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-neutral-500">
              {t("admin.freeGuideBrevo")}
            </p>
          </div>
        </div>
      </div>

      {saveState && !saveState.ok && saveState.error && (
        <p className="mt-3 text-[12.5px] font-semibold text-danger">
          {t(saveState.error as never)}
        </p>
      )}

      <div className="mt-4">
        <SubmitButton pending={savePending}>
          <span className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {t("admin.saveAuthSettings")}
          </span>
        </SubmitButton>
      </div>
    </form>
  );
}
