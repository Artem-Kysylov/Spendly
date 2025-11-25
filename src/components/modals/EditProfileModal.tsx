'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { UserAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import Button from '@/components/ui-elements/Button'
import FormInput from '@/components/ui-elements/FormInput'
import ToastMessage from '@/components/ui-elements/ToastMessage'
import { Eye, EyeOff, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { session } = UserAuth()
  const tModals = useTranslations('modals')
  const tCommon = useTranslations('common')

  const [isLoading, setIsLoading] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [errors, setErrors] = useState({
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Initialize form with current user data
  useEffect(() => {
    if (session?.user?.email) {
      setFormData(prev => ({
        ...prev,
        email: session.user.email || ''
      }))
    }
  }, [session])

  const showToast = (text: string, type: 'success' | 'error') => {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  const validateForm = () => {
    const newErrors = {
      email: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    // Password validation (only if user wants to change password)
    if (formData.newPassword || formData.confirmPassword || formData.currentPassword) {
      if (!formData.currentPassword) {
        newErrors.currentPassword = 'Current password is required to change password'
      }

      if (!formData.newPassword) {
        newErrors.newPassword = 'New password is required'
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = 'Password must be at least 6 characters'
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match'
      }
    }

    setErrors(newErrors)
    return Object.values(newErrors).every(error => !error)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsLoading(true)

    try {
      // Update email if changed
      if (formData.email !== session?.user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email
        })
        if (emailError) throw emailError
      }

      // Update password if provided
      if (formData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword
        })
        if (passwordError) throw passwordError
      }

      showToast(tModals('editProfile.toast.updateSuccess'), 'success')
      onSuccess?.()

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))

      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (error: any) {
      console.error('Error updating profile:', error)
      showToast(error?.message || tModals('editProfile.toast.updateFailed'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
      // Reset form
      setFormData({
        email: session?.user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setErrors({
        email: '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    }
  }

  if (!isOpen) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tModals('editProfile.title')}</DialogTitle>
            <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"><X size={22} /></DialogClose>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              {/* Email */}
              <FormInput
                label="Email"
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                error={errors.email}
                disabled={isLoading}
              />

              {/* Current Password */}
              <div className="relative">
                <FormInput
                  label="Current Password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(value) => handleInputChange('currentPassword', value)}
                  error={errors.currentPassword}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* New Password */}
              <div className="relative">
                <FormInput
                  label="New Password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(value) => handleInputChange('newPassword', value)}
                  error={errors.newPassword}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative">
                <FormInput
                  label="Confirm New Password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(value) => handleInputChange('confirmPassword', value)}
                  error={errors.confirmPassword}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                text={tCommon('cancel')}
                onClick={handleClose}
                variant="outline"
                disabled={isLoading}
              />
              <Button
                text={isLoading ? 'Updating...' : 'Update Profile'}
                type="submit"
                variant="primary"
                disabled={isLoading}
                isLoading={isLoading}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {toast && (
        <ToastMessage
          text={toast.text}
          type={toast.type}
        />
      )}
    </>
  )
}

export default EditProfileModal