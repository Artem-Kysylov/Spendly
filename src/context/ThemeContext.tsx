"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Theme = "light" | "dark" | "system";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "app-theme";
const FORCE_THEME_ATTR = "data-force-theme";

function getSystemIsDark() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return getSystemIsDark() ? "dark" : "light";
  return theme;
}

function getForcedTheme(): "light" | "dark" | null {
  if (typeof document === "undefined") return null;
  const raw = document.documentElement.getAttribute(FORCE_THEME_ATTR);
  if (raw === "light" || raw === "dark") return raw;
  return null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    }
    return "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(
    resolveTheme(theme),
  );

  useEffect(() => {
    const forced = getForcedTheme();
    const r = forced ?? resolveTheme(theme);
    setResolvedTheme(r);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", r === "dark");
    }
    if (!forced) {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch {}
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getForcedTheme()) return;
      if (theme === "system") {
        const r = media.matches ? "dark" : "light";
        setResolvedTheme(r);
        document.documentElement.classList.toggle("dark", r === "dark");
      }
    };
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = document.documentElement;
    const apply = () => {
      const forced = getForcedTheme();
      const r = forced ?? resolveTheme(theme);
      setResolvedTheme(r);
      el.classList.toggle("dark", r === "dark");
    };

    const observer = new MutationObserver((mutations) => {
      if (!mutations.some((m) => m.attributeName === FORCE_THEME_ATTR)) return;
      apply();
    });
    observer.observe(el, { attributes: true });
    apply();

    return () => observer.disconnect();
  }, [theme]);

  // Слушаем «внешние» обновления темы (например, из AuthContext) через custom event
  useEffect(() => {
    const handler = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored);
      }
    };
    window.addEventListener(
      "theme-preference-updated",
      handler as EventListener,
    );
    return () =>
      window.removeEventListener(
        "theme-preference-updated",
        handler as EventListener,
      );
  }, []);

  const [overlayVisible, setOverlayVisible] = useState(false);
  const [fadeKey, setFadeKey] = useState(0);
  const prefersReduced = useReducedMotion();

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolvedTheme,
      setTheme: (next: Theme) => {
        setThemeState(next);
        if (!prefersReduced) {
          setFadeKey((k) => k + 1);
          setOverlayVisible(true);
        }
      },
    }),
    [theme, resolvedTheme, prefersReduced],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {overlayVisible && !prefersReduced && (
          <motion.div
            key={fadeKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut", times: [0, 0.5, 1] }}
            onAnimationComplete={() => setOverlayVisible(false)}
            className="fixed inset-0 pointer-events-none z-[200]"
            style={{
              background: "linear-gradient(rgba(0,0,0,0.06), rgba(0,0,0,0.06))",
              willChange: "opacity",
            }}
          />
        )}
      </AnimatePresence>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
