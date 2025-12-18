// TopBar component
"use client";

import React, { useEffect, useState } from "react";
import NotificationBell from "@/components/ui-elements/NotificationBell";
import { useLocale } from "next-intl";
import useDeviceType from "@/hooks/useDeviceType";
import { useSubscription } from "@/hooks/useSubscription";
import { Link } from "@/i18n/routing";
import { UserAuth } from "@/context/AuthContext";
import ThemeSwitcher from "@/components/ui-elements/ThemeSwitcher";

const TopBar = () => {
  const [currentDate, setCurrentDate] = useState<string>("");
  const locale = useLocale();
  const { isDesktop } = useDeviceType();
  const { subscriptionPlan } = useSubscription();
  useEffect(() => {
    const formatted = new Date().toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    setCurrentDate(formatted);
  }, [locale]);

  const { session } = UserAuth();
  const displayName =
    session?.user?.user_metadata?.full_name ||
    session?.user?.user_metadata?.name ||
    session?.user?.email ||
    "U";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 pt-[env(safe-area-inset-top)] bg-transparent lg:bg-card lg:border-b lg:border-border transition-colors duration-300">
      <div className="mx-auto px-5 h-16 flex items-center justify-between">
        {/* Left: Avatar (settings) + date on desktop */}
        <div className="flex items-center gap-3">
          {/* аватар/настройки */}
          <Link
            href="/user-settings"
            className="block lg:hidden shrink-0"
            aria-label="User Settings"
          >
            {session?.user?.user_metadata?.avatar_url ? (
              <img
                className="w-8 h-8 rounded-full object-cover aspect-square shrink-0"
                src={session.user.user_metadata.avatar_url}
                alt="User Avatar"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full aspect-square shrink-0 flex items-center justify-center border border-border">
                <span className="text-foreground text-sm font-semibold">
                  {initial}
                </span>
              </div>
            )}
          </Link>
          <span className="hidden lg:inline-block text-sm text-muted-foreground">
            {currentDate}
          </span>
        </div>

        {/* Right: Theme switcher near bell; HIDDEN on mobile */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex">
            <ThemeSwitcher />
          </div>
          <NotificationBell minimal />
        </div>
      </div>
    </header>
  );
};

export default TopBar;
