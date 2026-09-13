"use client";

import { Phone, MessageCircle, MapPin, Clock, Facebook, Instagram, Music2, ExternalLink } from "lucide-react";
import { useI18n } from "@/i18n";
import { PageHeader } from "./ui";
import { GymEmblem } from "@/components/brand/logo";
import { HoursSection } from "./hours-section";

interface Gym {
  gymName: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  mapsUrl: string | null;
  hours: string | null;
  facebook: string | null;
  instagram: string | null;
  tiktok: string | null;
}

interface ScheduleDay {
  gender: "MALE" | "FEMALE";
  dayOfWeek: number;
  isOpen: boolean;
  note: string | null;
  slots: { startMin: number; endMin: number; label: string | null }[];
}

export function GymInfoClient({ gym, schedules }: { gym: Gym; schedules: ScheduleDay[] }) {
  const { t } = useI18n();

  const waNumber = gym.whatsapp?.replace(/[^0-9]/g, "");
  const waLink = waNumber
    ? `https://wa.me/${waNumber}`
    : gym.whatsapp
      ? `https://wa.me/${gym.whatsapp}`
      : null;

  return (
    <div>
      <PageHeader title={t("gym.title")} subtitle={t("gym.subtitle")} />

      {/* brand card */}
      <div
        className="card-sheen gold-tinted-card relative overflow-hidden rounded-2xl border border-primary/25 p-6 text-center"
      >
        <GymEmblem className="mx-auto h-20 w-20" priority floorShadow />
        <h2 className="font-display mt-4 text-xl font-black tracking-[0.08em] gold-text">
          {gym.gymName}
        </h2>
        <p className="mt-1.5 text-[10px] font-bold tracking-[0.4em] text-neutral-500">
          {t("gym.subtitle")}
        </p>
      </div>

      {/* action buttons */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        {gym.phone && (
          <a
            href={`tel:${gym.phone.replace(/\s/g, "")}`}
            className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl bg-primary text-black transition-all hover:bg-[#ffd700] active:scale-95"
          >
            <Phone className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">{t("gym.call")}</span>
          </a>
        )}
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-success/40 bg-success/10 text-success transition-all hover:bg-success/20 active:scale-95"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">{t("gym.whatsapp")}</span>
          </a>
        )}
        {gym.mapsUrl && (
          <a
            href={gym.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[72px] flex-col items-center justify-center gap-1.5 rounded-xl border border-neutral-700 bg-secondary text-neutral-200 transition-all hover:bg-secondary/70 active:scale-95"
          >
            <MapPin className="h-5 w-5" />
            <span className="text-[10px] font-extrabold tracking-wide">{t("gym.directions")}</span>
          </a>
        )}
      </div>

      {/* structured hours: men / women sections */}
      <HoursSection schedules={schedules} />

      {/* info cards */}
      <div className="mt-5 space-y-3">
        {gym.address && (
          <InfoCard icon={MapPin} label={t("gym.address")}>
            <a
              href={gym.mapsUrl ?? `https://maps.google.com/?q=${encodeURIComponent(gym.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-1.5 text-primary hover:underline"
            >
              {gym.address}
              <ExternalLink className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
          </InfoCard>
        )}
        {gym.hours && schedules.length === 0 && (
          <InfoCard icon={Clock} label={t("gym.openingHours")}>
            {gym.hours}
          </InfoCard>
        )}
        {gym.phone && (
          <InfoCard icon={Phone} label={t("gym.contact")}>
            <span dir="ltr">{gym.phone}</span>
          </InfoCard>
        )}
      </div>

      {/* social */}
      <div className="mt-5">
        <p className="mb-3 text-center text-[11px] font-black tracking-[0.2em] text-neutral-600 uppercase">
          {t("gym.followUs")}
        </p>
        <div className="flex justify-center gap-3">
          {gym.facebook && (
            <SocialLink href={gym.facebook} label="Facebook">
              <Facebook className="h-5 w-5" />
            </SocialLink>
          )}
          {gym.instagram && (
            <SocialLink href={gym.instagram} label="Instagram">
              <Instagram className="h-5 w-5" />
            </SocialLink>
          )}
          {gym.tiktok && (
            <SocialLink href={gym.tiktok} label="TikTok">
              <Music2 className="h-5 w-5" />
            </SocialLink>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card flex items-start gap-3.5 rounded-xl p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#151515]">
        <Icon className="h-5 w-5 text-primary/80" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold tracking-wide text-neutral-600 uppercase">{label}</p>
        <p className="mt-1 text-[13px] leading-relaxed text-neutral-200">{children}</p>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-neutral-800 text-neutral-400 transition-all hover:border-primary/40 hover:text-primary"
    >
      {children}
    </a>
  );
}
