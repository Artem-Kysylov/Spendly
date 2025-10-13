'use client'

import { useState } from 'react'
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
import Link from 'next/link'

export default function UserSettingsPage() {
    const { signOut, session } = UserAuth()
    const { isModalOpen: isSignOutModalOpen, openModal: openSignOutModal, closeModal: closeSignOutModal } = useModal()
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false)

    const handleEditProfile = () => {
        setIsEditProfileModalOpen(true)
    }

    const handleEditProfileClose = () => {
        setIsEditProfileModalOpen(false)
    }

    // Appearance & App Controls
    // Импортируем компоненты и хук
    const [isAppInstallModalOpen, setIsAppInstallModalOpen] = useState(false)
    const isPWAInstalled = useIsPWAInstalled()

    return (
        <>
            <div className="flex flex-col gap-6 px-5 pb-[30px]">
                {/* был узкий контейнер: max-w-4xl mx-auto */}
                <div className="w-full">
                    {/* Page Header */}
                    <div className="mt-[30px] mb-8">
                        <h1 className="text-[35px] font-semibold text-secondary-black dark:text-white">User Settings ⚙️</h1>
                        <p className="text-gray-600 dark:text-white mt-2">Manage your account settings and preferences</p>
                    </div>

                    {/* Settings Content */}
                    <div className="space-y-6">
                        {/* Profile Section */}
                        <ProfileCard onEditProfile={handleEditProfile} />
                        {/* Appearance Section — перенесён под Profile */}
                        <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-secondary-black dark:text-white mb-2">Appearance</h2>
                                    <p className="text-sm text-gray-600 dark:text-white">Choose your theme preference</p>
                                </div>
                                <ThemeSwitcher />
                            </div>
                        </div>
                        {/* остальные секции */}
                        {/* Notifications Section */}
                        <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-secondary-black mb-2 dark:text-white">Notifications</h2>
                                <p className="text-gray-600 dark:text-white text-sm">Manage how and when you receive notifications</p>
                            </div>
                            <NotificationSettings />
                        </div>

                        {/* Subscription Section */}
                        <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h2 className="text-lg font-semibold text-secondary-black dark:text-white">Subscription</h2>
                                    <p className="text-sm text-gray-600 dark:text-white">Compare plans and upgrade anytime</p>
                                </div>
                                <span
                                    className={`text-xs px-2 py-1 rounded border ${
                                        (session?.user?.user_metadata?.isPro ||
                                         (typeof window !== 'undefined' && localStorage.getItem('spendly_is_pro') === 'true'))
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900'
                                        : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900'
                                    }`}
                                >
                                    Current plan: {(session?.user?.user_metadata?.isPro ||
                                        (typeof window !== 'undefined' && localStorage.getItem('spendly_is_pro') === 'true'))
                                        ? 'Pro' : 'Free'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Free */}
                                <div className="rounded-lg border border-gray-200 dark:border-border p-5">
                                    <h3 className="font-medium text-secondary-black dark:text-white">Free</h3>
                                    <p className="text-sm text-gray-600 dark:text-white mt-1">Great to get started</p>
                                    <div className="mt-4">
                                        <div className="text-2xl font-semibold text-secondary-black dark:text-white">$0</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">per month</div>
                                    </div>
                                    <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-white">
                                        <li>• Track expenses and budgets</li>
                                        <li>• Basic charts and insights</li>
                                        <li>• Local device notifications</li>
                                    </ul>
                                </div>

                                {/* Pro */}
                                <div className="rounded-lg border border-primary dark:border-primary p-5 bg-primary/5 dark:bg-primary/10">
                                    <h3 className="font-medium text-secondary-black dark:text-white">Pro</h3>
                                    <p className="text-sm text-gray-600 dark:text-white mt-1">Power features for growth</p>
                                    <div className="mt-4">
                                        <div className="text-2xl font-semibold text-secondary-black dark:text-white">$5</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">per month</div>
                                    </div>
                                    <ul className="mt-4 space-y-2 text-sm text-gray-800 dark:text-white">
                                        <li>• Unlimited AI assistant usage</li>
                                        <li>• Advanced charts and comparisons</li>
                                        <li>• Priority support</li>
                                        <li>• Custom goals and alerts</li>
                                        <li>• Early access to new features</li>
                                    </ul>
                                    <div className="mt-5">
                                        <Link href="/payments" className="inline-flex">
                                            <Button text="Upgrade to Pro" variant="primary" />
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* App Controls Section */}
                        {!isPWAInstalled && (
                            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold text-secondary-black dark:text-white mb-2">App Controls</h2>
                                        <p className="text-sm text-gray-600 dark:text-white">Install the app for a native experience</p>
                                    </div>
                                    <Button
                                        text="Download the app"
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
                                    <h2 className="text-lg font-semibold text-secondary-black mb-4 dark:text-white">Account</h2>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                                            <div>
                                                <h3 className="font-medium text-secondary-black dark:text-white">Sign Out</h3>
                                                <p className="text-sm text-gray-600 dark:text-white">Sign out of your account</p>
                                            </div>
                                            <Button
                                                text='Sign Out'
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
                    title="Sign Out"
                    text="Are you sure you want to sign out?"
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