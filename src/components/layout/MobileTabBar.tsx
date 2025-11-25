// MobileTabBar component
'use client'

import { CreditCard, LayoutDashboard, Wallet } from 'lucide-react'
import { usePathname, Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'

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

  const items: { href: '/dashboard' | '/transactions' | '/budgets'; icon: any; label: string }[] = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/transactions', icon: CreditCard, label: 'Transactions' },
    { href: '/budgets', icon: Wallet, label: 'Budgets' },
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
        {/* 5-элементная сетка: [Дашборд] [Транзакции] [FAB +] [Бюджеты] [AI] */}
        <ul className="h-full grid grid-cols-5">
          {/* Дашборд */}
          <li className="flex items-center justify-center">
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              aria-current={pathname === '/dashboard' ? 'page' : undefined}
              className={`flex items-center justify-center h-full w-full transition-colors ${
                pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutDashboard className="h-6 w-6" />
            </Link>
          </li>

          {/* Транзакции */}
          <li className="flex items-center justify-center">
            <Link
              href="/transactions"
              aria-label="Transactions"
              aria-current={pathname === '/transactions' ? 'page' : undefined}
              className={`flex items-center justify-center h-full w-full transition-colors ${
                pathname === '/transactions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-6 w-6" />
            </Link>
          </li>

          {/* Центральный FAB (+) — акцентный, крупнее */}
          <li className="flex items-center justify-center">
            <button
              aria-label="Add Transaction"
              onClick={() => window.dispatchEvent(new CustomEvent('transactions:add'))}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all duration-200 -mt-6 border-4 border-white dark:border-card"
            >
              <span className="text-2xl leading-none">+</span>
            </button>
          </li>

          {/* Бюджеты */}
          <li className="flex items-center justify-center">
            <Link
              href="/budgets"
              aria-label="Budgets"
              aria-current={pathname === '/budgets' ? 'page' : undefined}
              className={`flex items-center justify-center h-full w-full transition-colors ${
                pathname === '/budgets' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wallet className="h-6 w-6" />
            </Link>
          </li>

          {/* AI Ассистент — градиент + sparkles.svg */}
          <li className="flex items-center justify-center">
            <button
              aria-label="AI Assistant"
              onClick={() => window.dispatchEvent(new CustomEvent('ai-assistant:open'))}
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 shadow hover:opacity-90 transition-opacity"
            >
              <span className="sr-only">AI Assistant</span>
              <div className="w-5 h-5 mx-auto">
                <Image src="/sparkles.svg" alt="Sparkles" width={20} height={20} />
              </div>
            </button>
          </li>
        </ul>
      </motion.nav>
    </AnimatePresence>
  )
}

export default MobileTabBar