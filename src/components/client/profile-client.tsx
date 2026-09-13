"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  UserCog,
  KeyRound,
  Globe,
  Settings2,
  Info,
  Bell,
  Tag,
  QrCode,
  LogOut,
  Trash2,
  CheckCircle2,
} from "lucide-react";
import { useI18n, type DictKey } from "@/i18n";
import { PageHeader } from "./ui";
import { Field, PasswordField, SubmitButton } from "@/components/brand/field";
import { AvatarPicker } from "@/components/brand/avatar-picker";
import { StatusBadge } from "@/components/brand/status-badge";
import {
  updateProfileAction,
  changePasswordAction,
  requestAccountDeletionAction,
} from "@/server-actions/client";
import { logoutAction } from "@/server-actions/auth";
import { useMgAction } from "@/lib/use-mg-action";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, "active" | "expiring" | "expired" | "paused" | "inactive"> = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring",
  EXPIRED: "expired",
  PAUSED: "paused",
  NONE: "inactive",
};

const GENDER_KEY: Record<string, DictKey> = {
  male: "common.male",
  female: "common.female",
  undisclosed: "common.preferNotSay",
};

export function ProfileClient({
  user,
  membershipStatus,
  planName,
}: {
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
    dob: string | null;
    gender: string | null;
    avatar: string | null;
    language: string;
    createdAt: string;
  };
  membershipStatus: string;
  planName: { nameAr: string; nameFr: string; nameEn: string } | null;
}) {
  const { t, pick, fmtDate, locale } = useI18n();
  const router = useRouter();
  const [avatar, setAvatar] = useState(user.avatar);
  const [profileState, profileAction, profilePending] = useMgAction(updateProfileAction);
  const [passState, passAction, passPending] = useMgAction(changePasswordAction);
  const [logoutPending, setLogoutPending] = useState(false);

  const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "—";

  const logout = async () => {
    setLogoutPending(true);
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const requestDeletion = async () => {
    const res = await requestAccountDeletionAction();
    if (res.ok) toast.success(t("profile.deleteRequested"));
    else toast.error(t("validation.serverError"));
  };

  const initials = (user.firstName?.[0] ?? "M").toUpperCase();

  const menuItems = [
    { href: "/client/notifications", icon: Bell, label: t("nav.notifications") },
    { href: "/client/offers", icon: Tag, label: t("nav.offers") },
    { href: "/client/qr", icon: QrCode, label: t("home.qrCode") },
    { href: "/client/gym-info", icon: Info, label: t("nav.gymInfo") },
  ];

  return (
    <div>
      <PageHeader title={t("profile.title")} />

      {/* profile card */}
      <div className="surface-card card-sheen rounded-2xl p-5">
        <div className="flex items-center gap-4">
          {user.avatar ? (
             
            <img
              src={user.avatar}
              alt=""
              className="h-16 w-16 rounded-2xl border border-primary/30 object-cover"
            />
          ) : (
            <span className="font-display flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-[#151515] text-2xl font-black text-primary">
              {initials}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-black text-neutral-50">{fullName}</p>
            <p className="truncate text-[12px] text-neutral-500" dir="ltr">
              {user.email}
            </p>
            <div className="mt-2">
              <StatusBadge tone={STATUS_TONE[membershipStatus] ?? "inactive"} />
            </div>
          </div>
        </div>
        {planName && (
          <p className="mt-3.5 border-t border-neutral-800/70 pt-3 text-[12px] text-neutral-400">
            {pick(planName)} · {t("profile.memberSince")} {fmtDate(user.createdAt)}
          </p>
        )}
      </div>

      {/* edit profile sheet */}
      <div className="mt-4">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex h-11 w-full items-center justify-between rounded-xl border border-neutral-800 px-4 text-[13.5px] font-bold text-neutral-200 transition-colors hover:border-primary/30">
              <span className="flex items-center gap-2.5">
                <UserCog className="h-4.5 w-4.5 text-primary" />
                {t("profile.editProfile")}
              </span>
              <ChevronRight className="h-4 w-4 text-neutral-600 rtl-flip" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="surface-elevated mx-auto max-h-[88dvh] max-w-lg rounded-t-3xl">
            <SheetHeader className="pb-0">
              <SheetTitle className="font-display text-left text-[17px] font-black text-neutral-50 rtl:text-right">
                {t("profile.editProfile")}
              </SheetTitle>
            </SheetHeader>
            <form action={profileAction} className="space-y-4 overflow-y-auto px-4 pb-6 pt-2">
              {profileState && (
                <p
                  className={cn(
                    "flex items-center gap-2 text-xs font-semibold",
                    profileState.ok ? "text-success" : "text-danger"
                  )}
                >
                  {profileState.ok && <CheckCircle2 className="h-4 w-4" />}
                  {profileState.ok ? t("profile.saved") : t(profileState.error as never)}
                </p>
              )}
              <input type="hidden" name="avatar" value={avatar ?? ""} />
              <input type="hidden" name="language" value={locale} />
              <div className="flex justify-center pt-1">
                <AvatarPicker value={avatar} onChange={setAvatar} size={84} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="pf-first"
                  name="firstName"
                  label={t("common.firstName")}
                  defaultValue={user.firstName ?? ""}
                  required
                />
                <Field
                  id="pf-last"
                  name="lastName"
                  label={t("common.lastName")}
                  defaultValue={user.lastName ?? ""}
                  required
                />
              </div>
              <Field
                id="pf-phone"
                name="phone"
                type="tel"
                label={t("common.phone")}
                defaultValue={user.phone ?? ""}
                dir="ltr"
                placeholder="+213 6xx xx xx xx"
              />
              <SubmitButton pending={profilePending}>{t("common.save")}</SubmitButton>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* change password sheet */}
      <div className="mt-3">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex h-11 w-full items-center justify-between rounded-xl border border-neutral-800 px-4 text-[13.5px] font-bold text-neutral-200 transition-colors hover:border-primary/30">
              <span className="flex items-center gap-2.5">
                <KeyRound className="h-4.5 w-4.5 text-primary" />
                {t("profile.changePassword")}
              </span>
              <ChevronRight className="h-4 w-4 text-neutral-600 rtl-flip" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="surface-elevated mx-auto max-h-[80dvh] max-w-lg rounded-t-3xl">
            <SheetHeader className="pb-0">
              <SheetTitle className="font-display text-left text-[17px] font-black text-neutral-50 rtl:text-right">
                {t("profile.changePassword")}
              </SheetTitle>
            </SheetHeader>
            <form action={passAction} className="space-y-4 overflow-y-auto px-4 pb-6 pt-2">
              {passState && (
                <p className={cn("text-xs font-semibold", passState.ok ? "text-success" : "text-danger")}>
                  {passState.ok ? t("profile.passwordChanged") : t(passState.error as never)}
                </p>
              )}
              <PasswordField
                id="cp-current"
                name="currentPassword"
                label={t("profile.currentPassword")}
                required
              />
              <PasswordField
                id="cp-new"
                name="newPassword"
                label={t("auth.newPassword")}
                hint={t("auth.passwordHint")}
                required
              />
              <PasswordField
                id="cp-confirm"
                name="confirmPassword"
                label={t("common.confirmPassword")}
                required
              />
              <SubmitButton pending={passPending}>{t("common.save")}</SubmitButton>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {/* quick links */}
      <div className="mt-3 space-y-3">
        {menuItems.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="flex h-11 items-center justify-between rounded-xl border border-neutral-800 px-4 text-[13.5px] font-bold text-neutral-200 transition-colors hover:border-primary/30"
          >
            <span className="flex items-center gap-2.5">
              <m.icon className="h-4.5 w-4.5 text-primary" />
              {m.label}
            </span>
            <ChevronRight className="h-4 w-4 text-neutral-600 rtl-flip" />
          </Link>
        ))}
        <Link
          href="/client/settings"
          className="flex h-11 items-center justify-between rounded-xl border border-neutral-800 px-4 text-[13.5px] font-bold text-neutral-200 transition-colors hover:border-primary/30"
        >
          <span className="flex items-center gap-2.5">
            <Settings2 className="h-4.5 w-4.5 text-primary" />
            {t("nav.settings")}
          </span>
          <ChevronRight className="h-4 w-4 text-neutral-600 rtl-flip" />
        </Link>
      </div>

      {/* logout */}
      <button
        onClick={logout}
        disabled={logoutPending}
        className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/5 text-[13px] font-bold text-danger transition-colors hover:bg-danger/10"
      >
        <LogOut className="h-4.5 w-4.5 rtl-flip" />
        {t("common.logout")}
      </button>

      {/* delete account */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button className="mt-3 flex w-full items-center justify-center gap-1.5 py-2 text-[11.5px] font-medium text-neutral-600 transition-colors hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" />
            {t("profile.deleteAccount")}
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent className="surface-elevated border-border/70">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neutral-100">
              {t("profile.deleteConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400 leading-relaxed">
              {t("profile.deleteWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-neutral-700 bg-transparent text-neutral-300 hover:bg-white/5">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={requestDeletion}
              className="bg-danger text-white hover:bg-danger/80"
            >
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
