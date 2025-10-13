'use client'

import React, { useState, useRef } from 'react'
import { Upload, User, X } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { UserAuth } from '@/context/AuthContext'
import Button from './Button'
import Spinner from './Spinner'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  onAvatarUpdate?: (avatarUrl: string | null) => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
  showRemoveButton?: boolean
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onAvatarUpdate,
  size = 'md',
  className = '',
  showRemoveButton = true
}) => {
  const { session } = UserAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Размеры в зависимости от пропа size
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  }

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !session?.user?.id) return

    // Валидация файла
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setUploadError('File size must be less than 5MB')
      return
    }

    setIsUploading(true)
    setUploadError(null)

    try {
      // Создаем уникальное имя файла
      const fileExt = file.name.split('.').pop()
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      // Загружаем файл в Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('user-avatars')
        .getPublicUrl(filePath)

      const avatarUrl = urlData.publicUrl

      // Обновляем профиль пользователя
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      })

      if (updateError) {
        throw updateError
      }

      // Вызываем callback
      onAvatarUpdate?.(avatarUrl)

    } catch (error: any) {
      console.error('Error uploading avatar:', error)
      setUploadError(error.message || 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
      // Очищаем input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveAvatar = async () => {
    if (!session?.user?.id) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Удаляем avatar_url из профиля пользователя
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })

      if (updateError) {
        throw updateError
      }

      // Вызываем callback
      onAvatarUpdate?.(null)

    } catch (error: any) {
      console.error('Error removing avatar:', error)
      setUploadError(error.message || 'Failed to remove avatar')
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* Avatar Display */}
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700`}>
        {currentAvatarUrl ? (
          <img
            src={currentAvatarUrl}
            alt="User Avatar"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <User size={iconSizes[size]} className="text-gray-400" />
          </div>
        )}
        
        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>

      {/* Upload Button */}
      <div className="flex gap-2">
        <Button
          text={currentAvatarUrl ? "Change Avatar" : "Upload Avatar"}
          variant="outline"
          onClick={triggerFileInput}
          disabled={isUploading}
          icon={<Upload size={16} />}
          className="text-sm"
        />
        
        {/* Remove Button */}
        {currentAvatarUrl && showRemoveButton && (
          <Button
            text="Remove"
            variant="outline"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
            icon={<X size={16} />}
            className="text-sm text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950"
          />
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error Message */}
      {uploadError && (
        <p className="text-sm text-red-600 text-center max-w-xs">
          {uploadError}
        </p>
      )}
    </div>
  )
}

export default AvatarUpload