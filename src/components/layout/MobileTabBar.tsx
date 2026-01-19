// MobileTabBar component
"use client";

import { CreditCard, LayoutDashboard, Wallet, Plus } from "lucide-react";
import { usePathname, Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import router from "next/router";
import React, { useEffect, useState } from "react";
import { useUIStore } from "@/store/ui-store";

function MobileTabBar() {
  const t = useTranslations("Sidenav");
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const tLayout = useTranslations("layout");
  const router = useRouter();

  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone = () => {
      const mq = window.matchMedia
        ? window.matchMedia("(display-mode: standalone)")
        : null;
      const isStandaloneMatch = mq?.matches ?? false;
      const isNavigatorStandalone =
        (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMatch || isNavigatorStandalone);
    };

    checkStandalone();

    const mq = window.matchMedia
      ? window.matchMedia("(display-mode: standalone)")
      : null;
    mq?.addEventListener("change", checkStandalone);

    return () => {
      mq?.removeEventListener("change", checkStandalone);
    };
  }, []);

  const { isTabBarVisible } = useUIStore();

  const navTransition = { duration: 0.5, ease: "easeOut" } as const;

  // iOS PWA (standalone) often breaks fixed positioning when transforms are applied.
  // Avoid y/transform animations in standalone mode to keep the tab bar pinned to bottom.
  const allowTransform = !isStandalone && !prefersReduced;

  // заметный fade+slide; variants передаём только если не reduced
  const routeVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  };

  const items: {
    href: "/dashboard" | "/transactions" | "/budgets";
    icon: any;
    label: string;
  }[] = [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/transactions", icon: CreditCard, label: "Transactions" },
      { href: "/budgets", icon: Wallet, label: "Budgets" },
    ];

  return (
    <AnimatePresence mode="wait">
      {/* DO NOT REMOVE: Fixed for iOS PWA Safe Area */}
      <motion.nav
        key={pathname}
        initial={allowTransform ? { opacity: 0, y: 20 } : { opacity: 0 }}
        animate={allowTransform ? { opacity: 1, y: 0 } : { opacity: 1 }}
        exit={allowTransform ? { opacity: 0, y: 20 } : { opacity: 0 }}
        transition={navTransition}
        style={{ willChange: "opacity, transform" }}
        className={`${!isTabBarVisible ? "hidden" : ""} fixed bottom-0 left-0 right-0 lg:hidden z-50 border-t border-border bg-background dark:bg-card ${isStandalone ? "pb-[env(safe-area-inset-bottom)]" : ""}`}
        aria-label="Bottom navigation"
      >
        <div>
          <ul className="h-20 grid grid-cols-5 grid-rows-1 items-stretch pt-1 pb-2">
          {/* Дашборд */}
          <li className="flex items-center justify-center">
            <Link
              href="/dashboard"
              aria-label={tLayout("sidebar.dashboard")}
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${pathname === "/dashboard"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <LayoutDashboard className="h-6 w-6" />
              <span className="text-[9px] font-light">
                {tLayout("sidebar.dashboard")}
              </span>
            </Link>
          </li>

          {/* Транзакции */}
          <li className="flex items-center justify-center">
            <Link
              href="/transactions"
              aria-label={tLayout("sidebar.transactions")}
              aria-current={pathname === "/transactions" ? "page" : undefined}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${pathname === "/transactions"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <CreditCard className="h-6 w-6" />
              <span className="text-[9px] font-light">
                {tLayout("sidebar.transactions")}
              </span>
            </Link>
          </li>

          {/* Центральный FAB (+) — без подписи */}
          <li className="flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-0.5">
              <button
                aria-label={tLayout("sidebar.addTransaction")}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("transactions:add"))
                }
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-200 border-2 border-white dark:border-card flex items-center justify-center"
              >
                <Plus className="w-6 h-6 block" />
              </button>
            </div>
          </li>
          {/* Бюджеты */}
          <li className="flex items-center justify-center">
            <Link
              href="/budgets"
              aria-label={tLayout("sidebar.budgets")}
              aria-current={pathname === "/budgets" ? "page" : undefined}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${pathname === "/budgets"
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Wallet className="h-6 w-6" />
              <span className="text-[9px] font-light">
                {tLayout("sidebar.budgets")}
              </span>
            </Link>
          </li>

          {/* AI Ассистент — градиент и подпись */}
          <li className="flex items-center justify-center">
            <button
              aria-label={tLayout("sidebar.aiAssistant")}
              onClick={() => router.push("/ai-assistant")}
              className="flex flex-col items-center justify-center h-full w-full gap-0.5 hover:opacity-90 transition-opacity"
            >
              <span className="sr-only">{tLayout("sidebar.aiAssistant")}</span>
              <div
                className={`${prefersReduced ? "" : "gradient-animated"} w-6 h-6 bg-gradient-to-r from-primary to-primary-800`}
                style={{
                  WebkitMaskImage: "url(/sparkles.svg)",
                  maskImage: "url(/sparkles.svg)",
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
              <span
                className={`text-[9px] font-light ${pathname === "/ai-assistant" ? "text-primary" : "text-muted-foreground"}`}
              >
                {tLayout("sidebar.aiAssistant")}
              </span>
            </button>
          </li>
          </ul>
        </div>
      </motion.nav>
    </AnimatePresence>
  );
}

export default MobileTabBar;
