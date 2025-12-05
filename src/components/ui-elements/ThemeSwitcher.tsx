"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/context/ThemeContext";
import { UserAuth } from "@/context/AuthContext";

const ThemeSwitcher = () => {
  const { setUserThemePreference } = UserAuth();
  const { resolvedTheme, setTheme } = useTheme();
  // Избегаем SSR/CSR рассинхронизации: рендерим нейтральное состояние до маунта
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);
  const isDark = mounted ? resolvedTheme === "dark" : false;

  const handleToggle = async (checked: boolean) => {
    const next = checked ? "dark" : "light";
    setTheme(next);
    await setUserThemePreference(next);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Sun icon for light theme */}
      <Sun
        className={`size-4 transition-colors ${
          mounted
            ? !isDark
              ? "text-primary"
              : "text-muted-foreground"
            : "text-muted-foreground"
        }`}
      />

      {/* Custom styled switch */}
      <div className="relative">
        <Switch
          checked={mounted ? isDark : false}
          onCheckedChange={handleToggle}
          aria-label="Toggle theme"
          className="
            peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full 
            border border-primary bg-background transition-colors
            data-[state=checked]:bg-background data-[state=unchecked]:bg-background
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
            disabled:cursor-not-allowed disabled:opacity-50
          "
        />
        {/* Custom thumb with primary color */}
        <div
          className={`
          absolute top-0.5 left-0.5 size-5 rounded-full bg-primary shadow transition-transform duration-200
          ${mounted && isDark ? "translate-x-5" : "translate-x-0"}
        `}
        />
      </div>

      {/* Moon icon for dark theme */}
      <Moon
        className={`size-4 transition-colors ${
          mounted
            ? isDark
              ? "text-primary"
              : "text-muted-foreground"
            : "text-muted-foreground"
        }`}
      />
    </div>
  );
};

export default ThemeSwitcher;
