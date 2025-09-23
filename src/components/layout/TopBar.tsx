'use client'

import NotificationBell from '@/components/ui-elements/NotificationBell'

const TopBar = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b">
            <div className="mx-auto px-5 h-16 flex items-center justify-between">
                {/* Current Date */}
                <div className="text-sm text-secondary-black font-medium">
                    {currentDate}
                </div>

                {/* Notifications */}
                <div className="flex items-center">
                    <NotificationBell count={99} />
                </div>
            </div>
        </header>
    )
}

export default TopBar