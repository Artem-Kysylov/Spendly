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
      <Sun
        className={`size-4 transition-colors ${
          mounted
            ? !isDark
              ? "text-primary"
              : "text-muted-foreground"
            : "text-muted-foreground"
        }`}
      />

      <Switch
        checked={mounted ? isDark : false}
        onCheckedChange={handleToggle}
        aria-label="Toggle theme"
        className="border-primary bg-background data-[state=checked]:bg-background data-[state=unchecked]:bg-background"
        thumbClassName="bg-primary data-[state=checked]:bg-primary"
      />

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
