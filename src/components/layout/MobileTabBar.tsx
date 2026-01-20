// MobileTabBar component
"use client";

import { CreditCard, LayoutDashboard, Wallet, Plus } from "lucide-react";
import { usePathname, Link, useRouter } from "@/i18n/routing";
import { useTranslations } from "next-intl";
import React from "react";
import { useUIStore } from "@/store/ui-store";

function MobileTabBar() {
  const pathname = usePathname();
  const tLayout = useTranslations("layout");
  const router = useRouter();

  const { isTabBarVisible } = useUIStore();

  return (
    <>
      {/* DO NOT REMOVE: Fixed for iOS PWA Safe Area */}
      <nav
        className={`${!isTabBarVisible ? "hidden" : ""} fixed bottom-0 left-0 right-0 lg:hidden z-50 border-t border-border bg-background dark:bg-card pwa-safe-bottom`}
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
                className={`gradient-animated w-6 h-6 bg-gradient-to-r from-primary to-primary-800`}
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
      </nav>
    </>
  );
}

export default MobileTabBar;
