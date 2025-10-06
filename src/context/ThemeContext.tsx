"use client"

import React, { createContext, useContext, useEffect, useMemo, useState } from "react"

type Theme = "light" | "dark" | "system"

type ThemeContextValue = {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (next: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "app-theme"

function getSystemIsDark() {
  if (typeof window === "undefined") return false
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return getSystemIsDark() ? "dark" : "light"
  return theme
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored
      }
    }
    return "system"
  })

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(resolveTheme(theme))

  useEffect(() => {
    const r = resolveTheme(theme)
    setResolvedTheme(r)
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", r === "dark")
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = () => {
      if (theme === "system") {
        const r = media.matches ? "dark" : "light"
        setResolvedTheme(r)
        document.documentElement.classList.toggle("dark", r === "dark")
      }
    }
    media.addEventListener?.("change", handler)
    return () => media.removeEventListener?.("change", handler)
  }, [theme])

  // Слушаем «внешние» обновления темы (например, из AuthContext) через custom event
  useEffect(() => {
    const handler = () => {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Theme | null
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored)
      }
    }
    window.addEventListener("theme-preference-updated", handler as EventListener)
    return () => window.removeEventListener("theme-preference-updated", handler as EventListener)
  }, [])

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedTheme,
    setTheme: (next: Theme) => setThemeState(next),
  }), [theme, resolvedTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}