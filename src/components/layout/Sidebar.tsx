'use client'

import { UserAuth } from '@/context/AuthContext'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, Wallet, Settings } from 'lucide-react'

const Sidebar = () => {
    const { session } = UserAuth()
    const pathname = usePathname()

    const navigationItems = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: LayoutDashboard,
        },
        {
            name: 'Transactions',
            href: '/transactions',
            icon: CreditCard,
        },
        {
            name: 'Budgets',
            href: '/budgets',
            icon: Wallet,
        },
    ]

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="h-[65px] px-6 border-b border-gray-200 flex items-center">
                <Image 
                    src="/Spendly-logo.svg" 
                    alt="Spendly Logo" 
                    width={90} 
                    height={30}
                    className="h-8 w-auto"
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
                                        flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200
                                        ${isActive 
                                            ? 'bg-primary text-white' 
                                            : 'text-secondary-black hover:text-primary hover:bg-gray-50'
                                        }
                                    `}
                                >
                                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : ''}`} />
                                    {item.name}
                                </Link>
                            </li>
                        )
                    })}
                </ul>
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-gray-200">
                <Link
                    href="/user-settings"
                    className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200
                        ${pathname === '/user-settings' 
                            ? 'bg-primary text-white' 
                            : 'text-secondary-black hover:text-primary hover:bg-gray-50'
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
                        <Settings className={`h-5 w-5 ${pathname === '/user-settings' ? 'text-white' : ''}`} />
                    )}
                    <span>User Settings</span>
                </Link>
            </div>
        </aside>
    )
}

export default Sidebar