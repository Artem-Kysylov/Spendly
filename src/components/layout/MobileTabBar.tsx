// MobileTabBar component
'use client'

import { CreditCard, LayoutDashboard, Wallet, Plus } from 'lucide-react'
import { usePathname, Link, useRouter } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import router from 'next/router'
import React from 'react'

const MobileTabBar = () => {
  const t = useTranslations('Sidenav')
  const pathname = usePathname()
  const prefersReduced = useReducedMotion()
  const tLayout = useTranslations('layout')
  const router = useRouter()

  // Скрывать таббар при открытой клавиатуре (mobile)
  const [hideForKeyboard, setHideForKeyboard] = React.useState(false)
  React.useEffect(() => {
    const threshold = 120 // px сокращение высоты экрана, означающее открытую клавиатуру
    const onResize = () => {
      try {
        const vv = window.visualViewport
        if (!vv) return
        const shrink = window.innerHeight - vv.height
        setHideForKeyboard(shrink > threshold)
      } catch {}
    }
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null
      const isInput = !!target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.getAttribute('contenteditable') === 'true')
      if (isInput) setHideForKeyboard(true)
    }
    const onFocusOut = () => setHideForKeyboard(false)
    window.visualViewport?.addEventListener('resize', onResize)
    window.addEventListener('focusin', onFocusIn)
    window.addEventListener('focusout', onFocusOut)
    return () => {
      window.visualViewport?.removeEventListener('resize', onResize)
      window.removeEventListener('focusin', onFocusIn)
      window.removeEventListener('focusout', onFocusOut)
    }
  }, [])

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
        className={`${hideForKeyboard ? 'hidden' : ''} fixed bottom-0 left-0 right-0 h-24 pb-safe-bottom border-t border-border bg-white dark:bg-card lg:hidden z-50`}
        aria-label="Bottom navigation"
      >
        {/* 5-элементная сетка: [Дашборд] [Транзакции] [FAB +] [Бюджеты] [AI] */}
        <ul className="h-full grid grid-cols-5 pt-1 -translate-y-[15px]">
          {/* Дашборд */}
          <li className="flex items-center justify-center">
            <Link
              href="/dashboard"
              aria-label={tLayout('sidebar.dashboard')}
              aria-current={pathname === '/dashboard' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${
                pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutDashboard className="h-6 w-6" />
              <span className="text-[8px] font-light">{tLayout('sidebar.dashboard')}</span>
            </Link>
          </li>

          {/* Транзакции */}
          <li className="flex items-center justify-center">
            <Link
              href="/transactions"
              aria-label={tLayout('sidebar.transactions')}
              aria-current={pathname === '/transactions' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${
                pathname === '/transactions' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <CreditCard className="h-6 w-6" />
              <span className="text-[8px] font-light">{tLayout('sidebar.transactions')}</span>
            </Link>
          </li>

          {/* Центральный FAB (+) — чуть меньше, по центру + подпись */}
          <li className="flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-0.5">
              <button
                aria-label={tLayout('sidebar.addTransaction')}
                onClick={() => window.dispatchEvent(new CustomEvent('transactions:add'))}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 transition-all duration-200 border-2 border-white dark:border-card flex items-center justify-center"
              >
                <Plus className="w-6 h-6 block" />
              </button>
              <span className="text-[8px] font-light text-muted-foreground">
                {tLayout('sidebar.addTransaction')}
              </span>
            </div>
          </li>

          {/* Бюджеты */}
          <li className="flex items-center justify-center">
            <Link
              href="/budgets"
              aria-label={tLayout('sidebar.budgets')}
              aria-current={pathname === '/budgets' ? 'page' : undefined}
              className={`flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors ${
                pathname === '/budgets' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wallet className="h-6 w-6" />
              <span className="text-[8px] font-light">{tLayout('sidebar.budgets')}</span>
            </Link>
          </li>

          {/* AI Ассистент — градиент по маске + подпись */}
          <li className="flex items-center justify-center">
            <button
              aria-label={tLayout('sidebar.aiAssistant')}
              onClick={() => router.push('/ai-assistant')}
              className="flex flex-col items-center justify-center h-full w-full gap-0.5 hover:opacity-90 transition-opacity"
            >
              <span className="sr-only">{tLayout('sidebar.aiAssistant')}</span>
              <div
                className={`${prefersReduced ? '' : 'gradient-animated'} w-6 h-6 bg-gradient-to-r from-primary to-primary-800`}
                style={{
                  WebkitMaskImage: 'url(/sparkles.svg)',
                  maskImage: 'url(/sparkles.svg)',
                  WebkitMaskRepeat: 'no-repeat',
                  maskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                  maskPosition: 'center',
                  WebkitMaskSize: 'contain',
                  maskSize: 'contain',
                }}
              />
              <span className={`text-[8px] font-light ${pathname === '/ai-assistant' ? 'text-primary' : 'text-muted-foreground'}`}>
                {tLayout('sidebar.aiAssistant')}
              </span>
            </button>
          </li>
        </ul>
      </motion.nav>
    </AnimatePresence>
  )
}

export default MobileTabBar