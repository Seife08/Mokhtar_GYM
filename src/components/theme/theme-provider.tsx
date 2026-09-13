"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * MOKHTAR GYM theme engine.
 *
 * The design system is dark-first: the dark palette lives in `:root`
 * (globals.css) and `html.dark`. Light mode swaps the class to
 * `html.light`, which re-maps every design token + the Tailwind
 * neutral scale + the dark arbitrary-hex surfaces via CSS overrides —
 * so a single class flip re-skins the whole app with zero JS paint.
 *
 * Preference is persisted in localStorage (`mg_theme`). A tiny inline
 * script in the root layout applies the class BEFORE first paint to
 * avoid a flash. The provider also syncs `<meta name="theme-color">`
 * so the mobile browser chrome follows the mode.
 */

export type Theme = "dark" | "light";

const STORAGE_KEY = "mg_theme";
const LIGHT_BG = "#f7f7f8";
const DARK_BG = "#080808";

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function readStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "dark";
  } catch {
    return "dark";
  }
}

function applyThemeClass(t: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", t === "dark");
  root.classList.toggle("light", t === "light");
  root.style.colorScheme = t;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t === "dark" ? DARK_BG : LIGHT_BG);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // starts as whatever the no-flash script already applied server-side
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("light")
        ? "light"
        : "dark";
    }
    return "dark";
  });

  useEffect(() => {
    // Source of truth AFTER mount: re-apply the stored theme unconditionally.
    // Rationale: React hydration can restore the server-rendered
    // className="dark" on <html>, silently undoing the no-flash script —
    // so the provider re-asserts the persisted preference once hydration
    // settles. Runs before paint of any user interaction; no visible flash.
    const stored = readStoredTheme();
    applyThemeClass(stored);
    setThemeState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = useCallback((t: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* private mode — keep in-memory only */
    }
    applyThemeClass(t);
    setThemeState(t);
  }, []);

  const toggle = useCallback(() => {
    setTheme(document.documentElement.classList.contains("light") ? "dark" : "light");
  }, [setTheme]);

  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
