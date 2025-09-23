'use client'

import { UserAuth } from '@/context/AuthContext'
import useModal from '@/hooks/useModal'
import Button from "@/components/ui-elements/Button"
import SignOutModal from '@/components/modals/SignOutModal'

export default function UserSettingsPage() {
    const { signOut } = UserAuth()
    const { isModalOpen, openModal, closeModal } = useModal()

    return (
        <div className="p-6">
            <div className="max-w-4xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-[35px] font-semibold text-secondary-black">User Settings</h1>
                    <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
                </div>

                {/* Settings Content */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="space-y-6">
                        {/* Account Section */}
                        <div>
                            <h2 className="text-lg font-semibold text-secondary-black mb-4">Account</h2>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                                    <div>
                                        <h3 className="font-medium text-secondary-black">Sign Out</h3>
                                        <p className="text-sm text-gray-600">Sign out of your account</p>
                                    </div>
                                    <Button
                                        text='Sign Out'
                                        variant="outline"
                                        className='text-red-600 border-red-600 hover:bg-red-50'
                                        onClick={openModal}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sign Out Modal */}
            {isModalOpen && (
                <SignOutModal 
                    title="Sign Out"
                    text="Are you sure you want to sign out?"
                    onClose={closeModal}
                    signOut={signOut}
                />
            )}
        </div>
    )
}