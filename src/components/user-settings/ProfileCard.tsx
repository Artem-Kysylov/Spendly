'use client'

import React, { useState } from 'react'
import { Edit2, Mail, Calendar } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { UserAuth } from '@/context/AuthContext'
import AvatarUpload from '@/components/ui-elements/AvatarUpload'
import Button from '@/components/ui-elements/Button'
import { format } from 'date-fns'

interface ProfileCardProps {
  onEditProfile?: () => void
}

const ProfileCard: React.FC<ProfileCardProps> = ({ onEditProfile }) => {
  const { session } = UserAuth()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    session?.user?.user_metadata?.avatar_url || null
  )

  const user = session?.user
  const isGoogleUser = user?.app_metadata?.provider === 'google'
  const userEmail = user?.email
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'
  const createdAt = user?.created_at ? new Date(user.created_at) : null

  const handleAvatarUpdate = (newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-secondary-black dark:text-white">Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-shrink-0">
            {isGoogleUser ? (
              // Google пользователи - только отображение аватара
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <span className="text-2xl font-semibold text-gray-600 dark:text-white">
                      {userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              // Email пользователи - возможность загрузки
              <AvatarUpload
                currentAvatarUrl={avatarUrl}
                onAvatarUpdate={handleAvatarUpdate}
                size="lg"
              />
            )}
          </div>

          {/* User Info */}
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="text-xl font-semibold text-secondary-black dark:text-white">{userName}</h3>
              <div className="flex items-center gap-2 text-gray-600 dark:text-white mt-1">
                <Mail size={16} />
                <span className="text-sm">{userEmail}</span>
              </div>
              {createdAt && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-white mt-1">
                  <Calendar size={16} />
                  <span className="text-sm">
                    Member since {format(createdAt, 'MMMM yyyy')}
                  </span>
                </div>
              )}
            </div>

            {/* Provider Badge */}
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                isGoogleUser 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
              }`}>
                {isGoogleUser ? 'Google Account' : 'Email Account'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Button - только для email пользователей */}
        {!isGoogleUser && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button
              text="Edit Profile"
              variant="outline"
              onClick={onEditProfile}
              icon={<Edit2 size={16} />}
              className="w-full md:w-auto"
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProfileCard