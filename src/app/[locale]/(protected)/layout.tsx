// ProtectedLayout component
"use client";

import React, { useEffect, useMemo, useState } from "react";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import { AIAssistantProvider, TransactionChatProvider } from "@/components/ai-assistant";
import MobileTabBar from "@/components/layout/MobileTabBar";
import AddTransactionProvider from "@/components/layout/AddTransactionProvider";
import useDeviceType from "@/hooks/useDeviceType";
import { usePathname, useSearchParams, useRouter as useNextRouter } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  Variants,
} from "framer-motion";
import PeriodicUpgradeBanner from "@/components/free/PeriodicUpgradeBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { UserAuth } from "@/context/AuthContext";
import Image from "next/image";

export default function ProtectedLayout({ children }: { children: React.ReactNode; }) {
  const { isDesktop, isMobile, isTablet } = useDeviceType();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useNextRouter();
  const prefersReduced = useReducedMotion();
  const { subscriptionPlan } = useSubscription();
  const { isReady, session } = UserAuth();

  const isPaywallRoute = useMemo(() => {
    if (!pathname) return false;
    return pathname.endsWith("/paywall") || pathname.includes("/paywall/");
  }, [pathname]);

  const currentPathWithSearch = useMemo(() => {
    const qs = searchParams?.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!isPaywallRoute) return;
    if (!isReady) return;
    if (session) return;

    const localePrefix = pathname?.split("/")?.[1];
    const authBase = localePrefix ? `/${localePrefix}/auth` : "/auth";
    const fallbackRedirectTo = localePrefix
      ? `/${localePrefix}/paywall`
      : "/paywall";

    const safeRedirectTo =
      typeof currentPathWithSearch === "string" &&
      currentPathWithSearch.startsWith("/") &&
      !currentPathWithSearch.startsWith("//")
        ? currentPathWithSearch
        : fallbackRedirectTo;

    const authUrl = `${authBase}?tab=signin&redirectTo=${encodeURIComponent(
      safeRedirectTo,
    )}`;
    router.replace(authUrl);
  }, [currentPathWithSearch, isPaywallRoute, isReady, router, session]);

  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkStandalone = () => {
      const mq = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
      const isStandaloneMatch = mq?.matches ?? false;
      const isNavigatorStandalone = (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMatch || isNavigatorStandalone);
    };
    checkStandalone();
    const mq = window.matchMedia ? window.matchMedia("(display-mode: standalone)") : null;
    mq?.addEventListener("change", checkStandalone);
    return () => {
      mq?.removeEventListener("change", checkStandalone);
    };
  }, []);

  // Типобезопасный transition (ease — кубическая кривая)
  const transition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const;

  // Условные variants: undefined при reduced motion, валидный объект иначе
  let pageVariants: Variants | undefined;
  if (!prefersReduced) {
    pageVariants = {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
    };
  }

  if (isPaywallRoute) {
    if (!isReady) return null;
    if (!session) return null;

    return (
      <div className="min-h-[100dvh] bg-background text-foreground transition-colors duration-300">
        <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-center px-4">
            <Image src="/Spendly-logo.svg" alt="Spendly" width={110} height={30} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 py-10">
          {children}
        </main>
      </div>
    );
  }

  return (
    <ProtectedRoute>
      {/* Удалён глобальный AIAssistantProvider */}
      <AddTransactionProvider />
      <TransactionChatProvider showFloatingButton={false} />
      <div className="flex h-[100dvh] transition-colors duration-300 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full overflow-hidden lg:ml-64 transition-colors duration-300">
          <motion.div
            key={`topbar-${pathname}`}
            initial={prefersReduced ? false : { opacity: 0, y: -4 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={transition}
            style={{ willChange: "opacity, transform" }}
          >
            <TopBar />
          </motion.div>
          {/* Периодический баннер: рендерим только после загрузки сессии */}
          {isReady && <PeriodicUpgradeBanner />}
          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              className={`${pathname?.includes("/ai-assistant") ? "flex-1 flex flex-col overflow-hidden min-w-0 min-h-0 transition-colors duration-300 overscroll-none" : `flex-1 overflow-y-auto overflow-x-hidden min-w-0 min-h-0 ${isStandalone ? "pb-[calc(env(safe-area-inset-bottom)+96px)]" : "pb-[96px]"} lg:pb-0 transition-colors duration-300`}`}
              initial={pageVariants ? "initial" : false}
              animate={pageVariants ? "animate" : { opacity: 1 }}
              exit={pageVariants ? "exit" : undefined}
              variants={pageVariants}
              transition={transition}
              style={{
                willChange: "opacity, transform",
                touchAction:
                  pathname?.includes("/ai-assistant")
                    ? "pan-y"
                    : undefined,
              }}
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>
        <MobileTabBar />
        {/* Угловую карточку НЕ рендерим глобально.
                Она показывается контекстно в AIChatWindow/Budgets/Charts при достижении лимитов. */}
        {/* (строку {isReady && subscriptionPlan === 'free' && <UpgradeCornerPanel />} удаляем) */}
      </div>
    </ProtectedRoute>
  );
}
