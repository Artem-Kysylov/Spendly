"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Button from "@/components/ui-elements/Button";
import FormInput from "@/components/ui-elements/FormInput";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { session } = UserAuth();
  const tModals = useTranslations("modals");
  const tCommon = useTranslations("common");

  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Initialize form with current user data
  useEffect(() => {
    if (session?.user?.email) {
      setFormData((prev) => ({
        ...prev,
        email: session.user.email || "",
      }));
    }
  }, [session]);

  const showToast = (text: string, type: "success" | "error") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const validateForm = () => {
    const newErrors = {
      email: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    };

    // Email validation
    if (!formData.email) {
      newErrors.email = tModals("editProfile.validation.emailRequired");
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = tModals("editProfile.validation.invalidEmail");
    }

    // Password validation (only if user wants to change password)
    if (
      formData.newPassword ||
      formData.confirmPassword ||
      formData.currentPassword
    ) {
      if (!formData.currentPassword) {
        newErrors.currentPassword =
          tModals("editProfile.validation.currentPasswordRequired");
      }

      if (!formData.newPassword) {
        newErrors.newPassword = tModals("editProfile.validation.newPasswordRequired");
      } else if (formData.newPassword.length < 6) {
        newErrors.newPassword = tModals("editProfile.validation.passwordMinLength");
      }

      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = tModals("editProfile.validation.passwordsDoNotMatch");
      }
    }

    setErrors(newErrors);
    return Object.values(newErrors).every((error) => !error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Update email if changed
      if (formData.email !== session?.user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: formData.email,
        });
        if (emailError) throw emailError;
      }

      // Update password if provided
      if (formData.newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: formData.newPassword,
        });
        if (passwordError) throw passwordError;
      }

      showToast(tModals("editProfile.toast.updateSuccess"), "success");
      onSuccess?.();

      // Reset password fields
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));

      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showToast(
        error?.message || tModals("editProfile.toast.updateFailed"),
        "error",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      // Reset form
      setFormData({
        email: session?.user?.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setErrors({
        email: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tModals("editProfile.title")}</DialogTitle>
            <DialogClose className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
              <X size={22} />
            </DialogClose>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              {/* Email */}
              <FormInput
                label={tModals("editProfile.fields.email")}
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange("email", value)}
                error={errors.email}
                disabled={isLoading}
              />

              {/* Current Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tModals("editProfile.fields.currentPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? "text" : "password"}
                    value={formData.currentPassword}
                    onChange={(e) =>
                      handleInputChange("currentPassword", e.target.value)
                    }
                    disabled={isLoading}
                    className={cn(
                      "h-[50px] px-[20px] pr-12",
                      errors.currentPassword && "border-red-500 focus:border-red-500",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowCurrentPassword(!showCurrentPassword)
                    }
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-red-500">{errors.currentPassword}</p>
                )}
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tModals("editProfile.fields.newPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? "text" : "password"}
                    value={formData.newPassword}
                    onChange={(e) => handleInputChange("newPassword", e.target.value)}
                    disabled={isLoading}
                    className={cn(
                      "h-[50px] px-[20px] pr-12",
                      errors.newPassword && "border-red-500 focus:border-red-500",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.newPassword && (
                  <p className="text-sm text-red-500">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {tModals("editProfile.fields.confirmNewPassword")}
                </label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      handleInputChange("confirmPassword", e.target.value)
                    }
                    disabled={isLoading}
                    className={cn(
                      "h-[50px] px-[20px] pr-12",
                      errors.confirmPassword &&
                        "border-red-500 focus:border-red-500",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                text={tCommon("cancel")}
                onClick={handleClose}
                variant="outline"
                disabled={isLoading}
              />
              <Button
                text={
                  isLoading
                    ? tModals("editProfile.actions.updating")
                    : tModals("editProfile.actions.update")
                }
                type="submit"
                variant="primary"
                disabled={isLoading}
                isLoading={isLoading}
              />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {toast && <ToastMessage text={toast.text} type={toast.type} />}
    </>
  );
};

export default EditProfileModal;
