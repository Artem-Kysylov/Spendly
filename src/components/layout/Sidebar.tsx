'use client'

import { UserAuth } from '@/context/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, Wallet, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'

const Sidebar = () => {
    const { session } = UserAuth()
    const pathname = usePathname()
    const tLayout = useTranslations('layout')
    const displayName =
      session?.user?.user_metadata?.full_name ||
      session?.user?.user_metadata?.name ||
      session?.user?.email ||
      'U'
    const initial = displayName.charAt(0).toUpperCase()

    const navigationItems = [
        {
            name: tLayout('sidebar.dashboard'),
            href: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            name: tLayout('sidebar.transactions'),
            href: '/transactions',
            icon: CreditCard,
        },
        {
            name: tLayout('sidebar.budgets'),
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
                    alt={tLayout('alt.logo')} 
                    width={90} 
                    height={30}
                    className="h-8 w-auto"
                    priority
                />
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
                </ul>
            </nav>

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
                    <span>{tLayout('sidebar.userSettings')}</span>
                </Link>
            </div>
        </aside>
    )
}

export default Sidebar