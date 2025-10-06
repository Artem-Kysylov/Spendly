'use client'

import NotificationBell from '@/components/ui-elements/NotificationBell'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/context/ThemeContext'
import { UserAuth } from '@/context/AuthContext'

const TopBar = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    return (
        <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b">
            <div className="mx-auto px-5 h-16 flex items-center justify-between">
                {/* Current Date */}
                <div className="text-sm text-foreground font-medium">
                    {currentDate}
                </div>
                {/* Notifications + Theme Switch */}
                <TopBarActions />
            </div>
        </header>
    )
}

function TopBarActions() {
  const { setUserThemePreference } = UserAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const handleToggle = async (checked: boolean) => {
    const next = checked ? 'dark' : 'light'
    setTheme(next)
    await setUserThemePreference(next)
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        {isDark ? (
          <svg className="size-4 text-foreground" viewBox="0 0 24 24" fill="none"><path d="M12 3a1 1 0 0 1 1 1v1a7 7 0 1 0 7 7h1a1 1 0 1 1 0 2h-1a9 9 0 1 1-9-9V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2"/></svg>
        ) : (
          <svg className="size-4 text-foreground" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" stroke="currentColor" strokeWidth="2"/></svg>
        )}
        <Switch checked={isDark} onCheckedChange={handleToggle} aria-label="Toggle theme" />
      <NotificationBell count={99} />
      </div>
    </div>
  )
}

export default TopBar