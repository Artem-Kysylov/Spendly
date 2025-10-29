'use client'

import { CreditCard, LayoutDashboard, Settings, Wallet } from 'lucide-react'
import { usePathname, Link } from '@/i18n/routing'
import type { AppPathnames } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const MobileTabBar = () => {
  const t = useTranslations('Sidenav')
  const pathname = usePathname()
  const prefersReduced = useReducedMotion()

  // Премиум анимация с ease-out
  const navTransition = { duration: 0.5, ease: "easeOut" } as const

  // заметный fade+slide; variants передаём только если не reduced
  const routeVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
  }

  const items: { href: '/dashboard' | '/transactions' | '/budgets' | '/user-settings'; icon: any; label: string }[] = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/transactions', icon: CreditCard, label: 'Transactions' },
    { href: '/budgets', icon: Wallet, label: 'Budgets' },
    { href: '/user-settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <AnimatePresence mode="wait">
      <motion.nav
        key={pathname}
        initial={prefersReduced ? false : { opacity: 0, y: 20 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={prefersReduced ? undefined : { opacity: 0, y: 20 }}
        transition={navTransition}
        style={{ willChange: 'opacity, transform' }}
        className="fixed bottom-0 left-0 right-0 h-16 border-t border-border bg-white dark:bg-card lg:hidden z-50"
        aria-label="Bottom navigation"
      >
        <ul className="h-full grid grid-cols-4">
          {items.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <li key={href} className="flex items-center justify-center">
                <Link
                  href={href}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center justify-center h-full w-full transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </Link>
              </li>
            )
          })}
        </ul>
      </motion.nav>
    </AnimatePresence>
  )
}

export default MobileTabBar
