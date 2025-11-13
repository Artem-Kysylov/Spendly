'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { UserAuth } from '@/context/AuthContext'
import useModal from '@/hooks/useModal'
import Button from "@/components/ui-elements/Button"
import SignOutModal from '@/components/modals/SignOutModal'
import EditProfileModal from '@/components/modals/EditProfileModal'
import NotificationSettings from '@/components/notifications/NotificationSettings'
import ProfileCard from '@/components/user-settings/ProfileCard'
import ThemeSwitcher from '@/components/ui-elements/ThemeSwitcher'
import useIsPWAInstalled from '@/hooks/useIsPWAInstalled'
import AppInstallModal from '@/components/modals/AppInstallModal'
import { Link } from '@/i18n/routing'
import { supabase } from '@/lib/supabaseClient'
import LanguageSelect from '@/components/ui-elements/locale/LanguageSelect'
import { useTranslations } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'
import { useParams } from 'next/navigation'
import ToneSettings from '@/components/ai-assistant/ToneSettings'
import RecurringRulesSettings from '@/components/user-settings/RecurringRulesSettings'
import { useSubscription } from '@/hooks/useSubscription'

export default function UserSettingsClient() {
  const { signOut, session } = UserAuth()
  const { isModalOpen: isSignOutModalOpen, openModal: openSignOutModal, closeModal: closeSignOutModal } = useModal()
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false)

  const handleEditProfile = () => setIsEditProfileModalOpen(true)
  const handleEditProfileClose = () => setIsEditProfileModalOpen(false)

  // Переводы
  const tSettings = useTranslations('userSettings')
  const tPricing = useTranslations('pricing')
  const tCTA = useTranslations('cta')
  const tCommon = useTranslations('common')
  const tAI = useTranslations('assistant')
  const { subscriptionPlan } = useSubscription()

  // Appearance & App Controls
  const [isAppInstallModalOpen, setIsAppInstallModalOpen] = useState(false)
  const isPWAInstalled = useIsPWAInstalled()

  // Language state (init from cookie or default 'en')
  const [language, setLanguage] = useState<'en' | 'uk' | 'ru' | 'hi' | 'id' | 'ja' | 'ko'>('en')
  const [isSavingLang, setIsSavingLang] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|; )spendly_locale=([^;]+)/)
      const cookieLang = m ? decodeURIComponent(m[1]) : null
      if (cookieLang && ['en','uk','ru','hi','id','ja','ko'].includes(cookieLang)) {
        setLanguage(cookieLang as any)
        document.documentElement.lang = cookieLang
      }
    }
  }, [])

  async function handleLanguageChange(next: typeof language) {
    setLanguage(next)
    document.documentElement.lang = next
    document.cookie = `spendly_locale=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`
    document.cookie = `NEXT_LOCALE=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`

    // Переключаем локаль, оставаясь на странице настроек
    router.replace({ pathname, params: params as any }, { locale: next })

    // Мгновенно перерисовываем серверные компоненты с новыми сообщениями
    router.refresh()

    if (session?.user?.id) {
      setIsSavingLang(true)
      try {
        const { data: { session: current } } = await supabase.auth.getSession()
        const token = current?.access_token
        if (!token) throw new Error('No auth token')
        const resp = await fetch('/api/user/locale', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ locale: next })
        })
        if (!resp.ok) {
          const err = await resp.json()
          throw new Error(err.error || 'Failed to save locale')
        }
      } catch (e) {
        console.error('Error saving locale:', e)
      } finally {
        setIsSavingLang(false)
      }
    }
  }

  // Admin AI daily limit
  const isAdmin = Boolean(session?.user?.user_metadata?.is_admin === true)
  const [aiDailyLimit, setAiDailyLimit] = useState<number | null>(null)
  const [savingAdminLimit, setSavingAdminLimit] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    ;(async () => {
      try {
        const { data: { session: current } } = await supabase.auth.getSession()
        const token = current?.access_token
        if (!token) return
        const resp = await fetch('/api/admin/ai-limit', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const json = await resp.json()
        if (resp.ok && typeof json.limit === 'number') {
          setAiDailyLimit(json.limit)
        }
      } catch {
        // no-op
      }
    })()
  }, [isAdmin])

  async function onAdminLimitToggle(checked: boolean) {
    if (!isAdmin) return
    setSavingAdminLimit(true)
    try {
      const { data: { session: current } } = await supabase.auth.getSession()
      const token = current?.access_token
      if (!token) return
      const resp = await fetch('/api/admin/ai-limit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ limit: checked ? 10 : 5 })
      })
      const json = await resp.json()
      if (resp.ok && typeof json.limit === 'number') {
        setAiDailyLimit(json.limit)
      }
    } catch {
      // no-op
    } finally {
      setSavingAdminLimit(false)
    }
  }

  return (
    <>
      <div className="flex flex-col gap-6 px-5 pb-[30px]">
        <div className="w-full">
          {/* Page Header */}
          <motion.div 
            className="mt-[30px] mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <motion.h1 
              className="text-[26px] sm:text-[32px] md:text-[35px] font-semibold text-secondary-black dark:text-white"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
            >
              {tSettings('header.title')}
            </motion.h1>
            <motion.p 
              className="text-sm sm:text-base text-gray-600 dark:text-white mt-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            >
              {tSettings('header.subtitle')}
            </motion.p>
          </motion.div>

          {/* Settings Content */}
          <div className="space-y-6">
            {/* Profile Section */}
            <ProfileCard onEditProfile={handleEditProfile} />

            {/* Appearance Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-secondary-black dark:text-white mb-2">
                    {tSettings('appearance.title')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-white">
                    {tSettings('appearance.description')}
                  </p>
                </div>
                <ThemeSwitcher />
              </div>
            </div>

            {/* Notifications Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-secondary-black mb-2 dark:text-white">
                  {tSettings('notifications.title')}
                </h2>
                <p className="text-gray-600 dark:text-white text-sm">
                  {tSettings('notifications.description')}
                </p>
              </div>
              <NotificationSettings />
            </div>

            {/* Удаляем импорт и секцию NotificationsDebug
            // import NotificationsDebug from '@/components/notifications/NotificationsDebug'
            
            {/* Recurring Rules Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-secondary-black mb-2 dark:text-white">
                  {tSettings('recurringRules.title')}
                </h2>
                <p className="text-gray-600 dark:text-white text-sm">
                  {tSettings('recurringRules.description')}
                </p>
              </div>
              <RecurringRulesSettings />
            </div>

            {/* Subscription Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-secondary-black dark:text-white">
                    {tSettings('subscription.title')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-white">
                    {tSettings('subscription.description')}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded border ${
                    subscriptionPlan === 'pro'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900'
                      : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900'
                  }`}
                >
                  {tSettings('subscription.currentPlan')}: {subscriptionPlan === 'pro' ? tPricing('pro.label') : tPricing('free.label')}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Free */}
                <div className="rounded-lg border border-gray-200 dark:border-border p-5">
                  <h3 className="font-medium text-secondary-black dark:text-white">
                    {tPricing('free.label')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-white mt-1">
                    {tPricing('free.short')}
                  </p>
                  <div className="mt-4">
                    <div className="text-2xl font-semibold text-secondary-black dark:text-white">$0</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tPricing('perMonth')}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-white">
                    <li>• {tPricing('free.features.track')}</li>
                    <li>• {tPricing('free.features.charts')}</li>
                    <li>• {tPricing('free.features.notifications')}</li>
                  </ul>
                </div>

                {/* Pro */}
                <div className="rounded-lg border border-primary dark:border-primary p-5 bg-primary/5 dark:bg-primary/10">
                  <h3 className="font-medium text-secondary-black dark:text-white">
                    {tPricing('pro.label')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-white mt-1">
                    {tPricing('pro.short')}
                  </p>
                  <div className="mt-4">
                    <div className="text-2xl font-semibold text-secondary-black dark:text-white">$7</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tPricing('perMonth')}
                    </div>
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-gray-800 dark:text-white">
                    <li>• {tPricing('pro.features.aiUnlimited')}</li>
                    <li>• {tPricing('pro.features.advancedCharts')}</li>
                    <li>• {tPricing('pro.features.prioritySupport')}</li>
                    <li>• {tPricing('pro.features.customGoals')}</li>
                    <li>• {tPricing('pro.features.earlyAccess')}</li>
                  </ul>
                  <div className="mt-5">
                    <Link href={{ pathname: '/payment' }} className="inline-flex">
                      <Button text={tCTA('upgradeToPro')} variant="primary" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Assistant Tone Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-secondary-black dark:text-white">
                  {tAI('settings.title')}
                </h2>
                <p className="text-sm text-gray-600 dark:text-white mt-1">
                  {tAI('settings.description')}
                </p>
              </div>
              <ToneSettings />
            </div>

            {/* Language Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-secondary-black dark:text-white">
                    {tSettings('language.title')}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-white">
                    {tSettings('language.description')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageSelect
                    value={language}
                    onChange={(l) => handleLanguageChange(l)}
                    className="min-w-[180px]"
                  />
                  {isSavingLang ? (
                    <span className="text-xs text-muted-foreground">
                      {tCommon('saving')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {/* App Controls Section */}
            {!isPWAInstalled && (
              <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-secondary-black dark:text-white mb-2">
                      {tSettings('appControls.title')}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-white">
                      {tSettings('appControls.description')}
                    </p>
                  </div>
                  <Button
                    text={tCTA('downloadApp')}
                    variant="default"
                    onClick={() => setIsAppInstallModalOpen(true)}
                  />
                </div>
              </div>
            )}

            {/* Account Section */}
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-secondary-black mb-4 dark:text-white">
                    {tSettings('account.title')}
                  </h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                      <div>
                        <h3 className="font-medium text-secondary-black dark:text-white">
                          {tSettings('account.signOut.title')}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-white">
                          {tSettings('account.signOut.description')}
                        </p>
                      </div>
                      <Button
                        text={tCTA('signOut')}
                        variant="outline"
                        className="bg-transparent text-red-600 border-red-600 hover:bg-red-600 hover:text-white hover:border-red-600 dark:hover:bg-red-600"
                        onClick={openSignOutModal}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Sign Out Modal */}
      {isSignOutModalOpen && (
        <SignOutModal 
          title={tSettings('modals.signOut.title')}
          text={tSettings('modals.signOut.text')}
          onClose={closeSignOutModal}
          signOut={signOut}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={handleEditProfileClose}
        onSuccess={() => {}}
      />

      {/* App Install Modal */}
      {isAppInstallModalOpen && (
        <AppInstallModal
          isOpen={isAppInstallModalOpen}
          onClose={() => setIsAppInstallModalOpen(false)}
        />
      )}
    </>
  )
}
