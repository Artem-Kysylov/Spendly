// MobileTabBar component
"use client";

import { CreditCard, LayoutDashboard, Wallet, Plus } from "lucide-react";
import { usePathname, Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import router from "next/router";
import React from "react";
import { useUIStore } from "@/store/ui-store";

function MobileTabBar() {
  const t = useTranslations("Sidenav");
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const tLayout = useTranslations("layout");
  const router = useRouter();

  // Скрывать таббар при открытой клавиатуре (mobile) - controlled by global store
  const { isTabBarVisible } = useUIStore();

  // Премиум анимация с ease-out
  const navTransition = { duration: 0.5, ease: "easeOut" } as const;

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
      <motion.nav
        key={pathname}
        initial={prefersReduced ? false : { opacity: 0, y: 20 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={prefersReduced ? undefined : { opacity: 0, y: 20 }}
        transition={navTransition}
        style={{ willChange: "opacity, transform" }}
        className={`${!isTabBarVisible ? "hidden" : ""} fixed bottom-0 left-0 right-0 h-[106px] pb-safe-bottom border-t border-border bg-white dark:bg-card lg:hidden z-50`}
        aria-label="Bottom navigation"
      >
        {/* 5-элементная сетка: [Дашборд] [Транзакции] [FAB +] [Бюджеты] [AI] */}
        <ul className="h-full grid grid-cols-5 pt-1 -translate-y-[5px]">
          {/* Дашборд */}
          <li className="flex items-center justify-center">
            <Link
              href="/dashboard"
              aria-label={tLayout("sidebar.dashboard")}
              aria-current={pathname === "/dashboard" ? "page" : undefined}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${
                pathname === "/dashboard"
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
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${
                pathname === "/transactions"
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
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${
                pathname === "/budgets"
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
      </motion.nav>
    </AnimatePresence>
  );
}

export default MobileTabBar;
