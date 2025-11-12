'use client'

// TopBar component
import React, { useEffect, useState } from 'react'
import NotificationBell from '@/components/ui-elements/NotificationBell'
import ThemeSwitcher from '@/components/ui-elements/ThemeSwitcher'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import TopbarRocketButton from '@/components/free/TopbarRocketButton'
import useDeviceType from '@/hooks/useDeviceType'
import { useSubscription } from '@/hooks/useSubscription'

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

    return (
        <header className="sticky top-0 z-40 bg-card border-b border-border transition-colors duration-300">
            <div className="mx-auto px-5 h-16 flex items-center">
                {/* Left: Date */}
                <div className="flex-1 flex items-center">
                    <span suppressHydrationWarning className="text-xs sm:text-sm md:text-base text-foreground font-medium">
                        {currentDate || '\u00A0'}
                    </span>
                </div>
                {/* Right: Theme + Notifications + Rocket */}
                <div className="flex-1 flex items-center justify-end gap-4">
                    <ThemeSwitcher />
                    <NotificationBell count={99} />
                    {!isDesktop && subscriptionPlan === 'free' && <TopbarRocketButton />}
                </div>
            </div>
        </header>
    )
}

export default TopBar