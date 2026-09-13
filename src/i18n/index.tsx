"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { en, type Dict, type DictKey } from "./locales/en";
import { ar } from "./locales/ar";
import { fr } from "./locales/fr";

export type Locale = "ar" | "fr" | "en";

const dictionaries: Record<Locale, Dict> = { ar, fr, en };

export const LOCALES: { code: Locale; label: string; dir: "rtl" | "ltr" }[] = [
  { code: "ar", label: "العربية", dir: "rtl" },
  { code: "fr", label: "Français", dir: "ltr" },
  { code: "en", label: "English", dir: "ltr" },
];

export function localeDir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (l: Locale) => void;
  t: (key: DictKey, params?: Record<string, string | number>) => string;
  /** localized name from a trilingual record */
  pick: (names: { nameAr?: string | null; nameFr?: string | null; nameEn?: string | null }) => string;
  fmtMoney: (amount: number, currency?: string) => string;
  fmtDate: (d: Date | string, opts?: Intl.DateTimeFormatOptions) => string;
  fmtTime: (d: Date | string) => string;
  fmtDateTime: (d: Date | string) => string;
  fmtNumber: (n: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const LS_KEY = "mg_locale";

function detectInitial(): Locale {
  if (typeof window === "undefined") return "ar";
  const saved = window.localStorage.getItem(LS_KEY);
  if (saved === "ar" || saved === "fr" || saved === "en") return saved;
  const nav = window.navigator.language?.slice(0, 2);
  if (nav === "ar") return "ar";
  if (nav === "fr") return "fr";
  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("ar");

  // Read persisted locale after mount; SSR always renders "ar"
  // so the first client paint matches the server (no hydration mismatch).
  useEffect(() => {
    const initial = detectInitial();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(initial);
  }, []);

  // apply to <html> without reloading
  useEffect(() => {
    const dir = localeDir(locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.documentElement.dataset.locale = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(LS_KEY, l);
    } catch {}
  }, []);

  const t = useCallback(
    (key: DictKey, params?: Record<string, string | number>) => {
      const dict = dictionaries[locale] ?? en;
      let str: string = (dict as Record<string, string>)[key] ?? (en as Record<string, string>)[key] ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return str;
    },
    [locale]
  );

  const pick = useCallback(
    (names: { nameAr?: string | null; nameFr?: string | null; nameEn?: string | null }) => {
      const map: Record<Locale, string | null | undefined> = {
        ar: names.nameAr,
        fr: names.nameFr,
        en: names.nameEn,
      };
      return map[locale] || names.nameEn || names.nameAr || names.nameFr || "";
    },
    [locale]
  );

  const intlLocale = locale === "ar" ? "ar-DZ" : locale === "fr" ? "fr-FR" : "en-GB";

  const fmtNumber = useCallback(
    (n: number) => new Intl.NumberFormat(intlLocale).format(n),
    [intlLocale]
  );

  const fmtMoney = useCallback(
    (amount: number, currency: string = "DZD") => {
      const cur = currency === "DZD" ? (locale === "ar" ? "دج" : locale === "fr" ? "DA" : "DZD") : currency;
      const num = new Intl.NumberFormat(intlLocale === "ar-DZ" ? "ar-DZ" : intlLocale, {
        maximumFractionDigits: 0,
      }).format(amount);
      return locale === "fr" ? `${num} ${cur}` : `${num} ${cur}`;
    },
    [intlLocale, locale]
  );

  const fmtDate = useCallback(
    (d: Date | string, opts?: Intl.DateTimeFormatOptions) => {
      const date = typeof d === "string" ? new Date(d) : d;
      if (isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(intlLocale, opts ?? { day: "numeric", month: "short", year: "numeric" }).format(date);
    },
    [intlLocale]
  );

  const fmtTime = useCallback(
    (d: Date | string) => {
      const date = typeof d === "string" ? new Date(d) : d;
      if (isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(intlLocale, { hour: "2-digit", minute: "2-digit" }).format(date);
    },
    [intlLocale]
  );

  const fmtDateTime = useCallback(
    (d: Date | string) => {
      const date = typeof d === "string" ? new Date(d) : d;
      if (isNaN(date.getTime())) return "—";
      return new Intl.DateTimeFormat(intlLocale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    },
    [intlLocale]
  );

  return (
    <I18nContext.Provider
      value={{
        locale,
        dir: localeDir(locale),
        setLocale,
        t,
        pick,
        fmtMoney,
        fmtDate,
        fmtTime,
        fmtDateTime,
        fmtNumber,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export type { DictKey };
