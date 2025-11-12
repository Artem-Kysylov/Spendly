'use client'

import React from 'react'
import TopBar from '@/components/layout/TopBar'
import Sidebar from '@/components/layout/Sidebar'
import ProtectedRoute from '@/components/guards/ProtectedRoute'
import { AIAssistantProvider } from '@/components/ai-assistant'
import MobileTabBar from '@/components/layout/MobileTabBar'
import useDeviceType from '@/hooks/useDeviceType'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion, Variants } from 'framer-motion'
import PeriodicUpgradeBanner from '@/components/free/PeriodicUpgradeBanner'
import UpgradeCornerPanel from '@/components/free/UpgradeCornerPanel'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { isDesktop, isMobile, isTablet } = useDeviceType()
  const pathname = usePathname()
  const prefersReduced = useReducedMotion()

  // Типобезопасный transition (ease — кубическая кривая)
  const transition = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const

  // Условные variants: undefined при reduced motion, валидный объект иначе
  let pageVariants: Variants | undefined
  if (!prefersReduced) {
    pageVariants = {
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -8 },
    }
  }

  return (
    <ProtectedRoute>
      <AIAssistantProvider/>
      <div className="flex h-screen transition-colors duration-300">
        <Sidebar />

        <div className="flex-1 flex flex-col lg:ml-64 transition-colors duration-300">
          <motion.div
            key={`topbar-${pathname}`}
            initial={prefersReduced ? false : { opacity: 0, y: -4 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={transition}
            style={{ willChange: 'opacity, transform' }}
          >
            <TopBar />
          </motion.div>

          {/* Периодический баннер (без логики показа/скрытия по дню) */}
          <PeriodicUpgradeBanner />

          <AnimatePresence mode="wait">
            <motion.main
              key={pathname}
              className="flex-1 overflow-auto pb-20 lg:pb-0 transition-colors duration-300"
              // При наличии variants — используем метки; при reduced — чёткие цели
              initial={pageVariants ? 'initial' : false}
              animate={pageVariants ? 'animate' : { opacity: 1 }}
              exit={pageVariants ? 'exit' : undefined}
              variants={pageVariants}
              transition={transition}
              style={{ willChange: 'opacity, transform' }}
            >
              {children}
            </motion.main>
          </AnimatePresence>
        </div>

        <MobileTabBar />

        {/* Угловое предупреждающее окно (без логики лимитов) */}
        <UpgradeCornerPanel />
      </div>
    </ProtectedRoute>
  )
}