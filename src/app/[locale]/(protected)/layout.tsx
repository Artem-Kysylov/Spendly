// ProtectedLayout component
"use client";

import React from "react";
import TopBar from "@/components/layout/TopBar";
import Sidebar from "@/components/layout/Sidebar";
import ProtectedRoute from "@/components/guards/ProtectedRoute";
import { AIAssistantProvider } from "@/components/ai-assistant";
import MobileTabBar from "@/components/layout/MobileTabBar";
import AddTransactionProvider from "@/components/layout/AddTransactionProvider";
import useDeviceType from "@/hooks/useDeviceType";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  Variants,
} from "framer-motion";
import PeriodicUpgradeBanner from "@/components/free/PeriodicUpgradeBanner";
import { useSubscription } from "@/hooks/useSubscription";
import { UserAuth } from "@/context/AuthContext";

export default function ProtectedLayout({ children }: { children: React.ReactNode; }) {
  const { isDesktop, isMobile, isTablet } = useDeviceType();
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const { subscriptionPlan } = useSubscription();
  const { isReady } = UserAuth();

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

  return (
    <ProtectedRoute>
      {/* Удалён глобальный AIAssistantProvider */}
      <AddTransactionProvider />
      <div className="flex h-[100dvh] min-h-[100dvh] transition-colors duration-300">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64 transition-colors duration-300">
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
              className={`${pathname?.includes("/ai-assistant") && isDesktop ? "flex-1 overflow-hidden min-w-0 min-h-0 transition-colors duration-300 overscroll-none" : "flex-1 overflow-y-auto overflow-x-hidden min-w-0 min-h-0 pb-[calc(env(safe-area-inset-bottom)+96px)] lg:pb-0 transition-colors duration-300"}`}
              initial={pageVariants ? "initial" : false}
              animate={pageVariants ? "animate" : { opacity: 1 }}
              exit={pageVariants ? "exit" : undefined}
              variants={pageVariants}
              transition={transition}
              style={{
                willChange: "opacity, transform",
                touchAction:
                  pathname?.includes("/ai-assistant") && isDesktop
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
