// TopBar component
'use client'

import React, { useEffect, useState } from 'react'
import NotificationBell from '@/components/ui-elements/NotificationBell'
import ThemeSwitcher from '@/components/ui-elements/ThemeSwitcher'
import { useLocale } from 'next-intl'
import TopbarRocketButton from '@/components/free/TopbarRocketButton'
import useDeviceType from '@/hooks/useDeviceType'
import { useSubscription } from '@/hooks/useSubscription'
import { Link } from '@/i18n/routing'
import { UserAuth } from '@/context/AuthContext'

const TopBar = () => {
    const [currentDate, setCurrentDate] = useState<string>('')
    const locale = useLocale()
    const { isDesktop } = useDeviceType()
    const { subscriptionPlan } = useSubscription()
    useEffect(() => {
        const formatted = new Date().toLocaleDateString(locale, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
        setCurrentDate(formatted)
    }, [locale])

    const { session } = UserAuth()
    const displayName =
        session?.user?.user_metadata?.full_name ||
        session?.user?.user_metadata?.name ||
        session?.user?.email ||
        'U'
    const initial = displayName.charAt(0).toUpperCase()
    return (
        <header className="sticky top-0 z-40 bg-card border-b border-border transition-colors duration-300">
            <div className="mx-auto px-5 h-16 flex items-center">
                {/* Left: Date */}
                <div className="flex-1 flex items-center">
                    {isDesktop ? (
                        <span suppressHydrationWarning className="text-xs sm:text-sm md:text-base text-foreground font-medium">
                            {currentDate || '\u00A0'}
                        </span>
                    ) : null}
                </div>
                {/* Right: Theme + Notifications + Rocket + (Mobile) Avatar Settings */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    <ThemeSwitcher />
                    <NotificationBell count={99} />
                    {!isDesktop && subscriptionPlan === 'free' && <TopbarRocketButton />}
                    {/* Мобильный аватар → Настройки */}
                    <Link
                        href="/user-settings"
                        className="block lg:hidden shrink-0"
                        aria-label="User Settings"
                    >
                        {session?.user?.user_metadata?.avatar_url ? (
                            <img
                                className="w-8 h-8 rounded-full object-cover aspect-square shrink-0"
                                src={session.user.user_metadata.avatar_url}
                                alt="User Avatar"
                                referrerPolicy="no-referrer"
                            />
                        ) : (
                            <div className="w-8 h-8 rounded-full aspect-square shrink-0 bg-indigo-600 dark:bg-indigo-400 flex items-center justify-center">
                                <span className="text-white text-sm font-semibold">{initial}</span>
                            </div>
                        )}
                    </Link>
                </div>
            </div>
        </header>
    )
}

export default TopBar