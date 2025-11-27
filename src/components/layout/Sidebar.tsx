// Sidebar component
'use client'

import { UserAuth } from '@/context/AuthContext'
import { usePathname } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { LayoutDashboard, CreditCard, Wallet, Plus, Sparkles } from 'lucide-react'
import Image from 'next/image'
import UpgradeSidebarBanner from '@/components/free/UpgradeSidebarBanner'
// удалено: import router from 'next/router'

const Sidebar = () => {
    const pathname = usePathname()
    const { session } = UserAuth()
    const tLayout = useTranslations('layout')
    const displayName =
      session?.user?.user_metadata?.full_name ||
      session?.user?.user_metadata?.name ||
      session?.user?.email ||
      'U'
    const initial = displayName.charAt(0).toUpperCase()
    // удалено: const router = useRouter()

    // Фолбэк: если ключ отсутствует, показываем читаемое значение
    const tOr = (key: string, fallback: string): string => {
      const val = tLayout(key as any)
      return typeof val === 'string' && (val === key || val === `layout.${key}`) ? fallback : val
    }

    const navigationItems: { name: string; href: '/dashboard' | '/transactions' | '/budgets'; icon: any }[] = [
        {
            name: tOr('sidebar.dashboard', 'Dashboard'),
            href: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            name: tOr('sidebar.transactions', 'Transactions'),
            href: '/transactions',
            icon: CreditCard,
        },
        {
            name: tOr('sidebar.budgets', 'Budgets'),
            href: '/budgets',
            icon: Wallet,
        },
    ]

    return (
        <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col">
            {/* Header with logo */}
            <div className="h-[65px] px-6 border-b border-border flex items-center">
                <Image 
                    src="/Spendly-logo.svg" 
                    alt={tOr('alt.logo', 'Spendly Logo')} 
                    width={90} 
                    height={30}
                    className="h-8 w-auto"
                    priority
                />
            </div>

            {/* Большая кнопка "Добавить транзакцию" */}
            <div className="px-4 pt-4">
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('transactions:add'))}
                    className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm shadow hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                    <Plus className="h-4 w-4 text-white" />
                    {tOr('sidebar.addTransaction', 'Добавить транзакцию')}
                </button>
            </div>

            {/* Navigation Section */}
            <nav className="flex-1 px-4 py-6">
                <ul className="space-y-2">
                    {navigationItems.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        
                        return (
                            <li key={item.name}>
                                <Link
                                    href={item.href}
                                    className={`
                                        flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-200
                                        px-3 py-2.5
                                        ${isActive 
                                            ? 'bg-primary/20 dark:bg-primary/30 text-primary px-5 py-4' 
                                            : 'text-foreground hover:text-primary hover:bg-muted'
                                        }
                                    `}
                                >
                                    <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
                                    {item.name}
                                </Link>
                            </li>
                        )
                    })}
                    {/* AI Ассистент как отдельный пункт меню — теперь Link и активное состояние */}
                    <li>
                        <Link
                            href="/ai-assistant"
                            className={`
                                flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-200
                                px-3 py-2.5
                                ${pathname === '/ai-assistant' 
                                    ? 'bg-primary/20 dark:bg-primary/30 text-primary px-5 py-4' 
                                    : 'text-foreground hover:text-primary hover:bg-muted'
                                }
                            `}
                        >
                            <Sparkles className={`h-5 w-5 ${pathname === '/ai-assistant' ? 'text-primary' : ''}`} />
                            <span>{tOr('sidebar.aiAssistant', 'AI Assistant')}</span>
                        </Link>
                    </li>
                </ul>
            </nav>

            {/* Upgrade banner */}
            <div className="px-4 pb-2">
                {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
                {/* @ts-ignore */}
                <UpgradeSidebarBanner />
            </div>

            {/* User Section */}
            <div className="p-4 border-t border-border">
                <Link
                    href="/user-settings"
                    className={`
                        flex items-center gap-3 rounded-md text-sm font-medium transition-all duration-200
                        px-3 py-2.5
                        ${pathname === '/user-settings' 
                            ? 'bg-primary/20 dark:bg-primary/30 text-primary px-5 py-4' 
                            : 'text-foreground hover:text-primary hover:bg-muted'
                        }
                    `}
                >
                    {session?.user?.user_metadata?.avatar_url ? (
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <img 
                                className="w-full h-full object-cover"
                                src={session.user.user_metadata.avatar_url}
                                alt='User Avatar'
                                referrerPolicy="no-referrer"
                            />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-indigo-600 dark:bg-indigo-400 flex items-center justify-center">
                            <span className="text-white text-sm font-semibold">{initial}</span>
                        </div>
                    )}
                    <span>{tOr('sidebar.userSettings', 'User Settings')}</span>
                </Link>
            </div>
        </aside>
    )
}

export default Sidebar