"use client";

import React, { useState, useRef } from "react";
import { Upload, User, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import Button from "./Button";
import Spinner from "./Spinner";
import { useAvatarProcessing } from "@/hooks/useAvatarProcessing";
import { useTranslations } from "next-intl";

interface AvatarUploadProps {
  currentAvatarUrl?: string | null;
  onAvatarUpdate?: (avatarUrl: string | null) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  showRemoveButton?: boolean;
  mode?: "profile" | "pre-signup";
  onProcessed?: (payload: { blob: Blob; previewUrl: string }) => void;
  onClear?: () => void;
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  currentAvatarUrl,
  onAvatarUpdate,
  size = "md",
  className = "",
  showRemoveButton = true,
  mode = "profile",
  onProcessed,
  onClear,
}) => {
  const { session } = UserAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    isProcessing,
    error: processingError,
    previewUrl,
    processFile,
    clear,
    progress,
    abort,
  } = useAvatarProcessing();

  const tErrors = useTranslations("errors");
  const tProfile = useTranslations("userSettings.profile");

  // Размеры в зависимости от пропа size
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (mode === "pre-signup") {
      try {
        setUploadError(null);
        const result = await processFile(file);
        onProcessed?.(result);
      } catch {
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
      return;
    }

    if (!session?.user?.id) return;

    if (!file.type.startsWith("image/")) {
      setUploadError(tErrors("selectImageFile"));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError(tErrors("fileTooLarge5mb"));
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${session.user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("user-avatars")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("user-avatars")
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl },
      });

      if (updateError) {
        throw updateError;
      }

      onAvatarUpdate?.(avatarUrl);
    } catch (error: any) {
      setUploadError(error.message || tErrors("uploadAvatarFailed"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    if (!session?.user?.id) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null },
      });

      if (updateError) {
        throw updateError;
      }

      onAvatarUpdate?.(null);
    } catch (error: any) {
      setUploadError(error.message || tErrors("removeAvatarFailed"));
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePreSignup = () => {
    abort();
    clear();
    onClear?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-border shadow-sm`}
      >
        {(mode === "pre-signup" ? previewUrl : currentAvatarUrl) ? (
          <img
            src={mode === "pre-signup" ? previewUrl! : currentAvatarUrl!}
            alt={tProfile("avatar.alt")}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <User
              size={iconSizes[size]}
              className="text-gray-400 dark:text-gray-300"
            />
          </div>
        )}
        {(isUploading || isProcessing) && (
          <div className="absolute inset-0 bg-black/50 dark:bg-black/40 flex items-center justify-center">
            <Spinner />
            {isProcessing && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700">
                <div
                  style={{ width: `${progress}%` }}
                  className="h-1 bg-primary"
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          text={
            (mode === "pre-signup" ? previewUrl : currentAvatarUrl)
              ? tProfile("avatar.change")
              : tProfile("avatar.upload")
          }
          variant="outline"
          onClick={triggerFileInput}
          disabled={isUploading || isProcessing}
          icon={<Upload size={16} />}
          className="text-sm"
        />
        {(mode === "pre-signup" ? !!previewUrl : !!currentAvatarUrl) &&
          showRemoveButton && (
            <Button
              text={tProfile("avatar.cancel")}
              variant="outline"
              onClick={handleRemovePreSignup}
              disabled={isUploading}
              className="text-sm"
            />
          )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {(uploadError || processingError) && (
        <p className="text-sm text-red-600 dark:text-red-500 text-center max-w-xs">
          {uploadError || processingError}
        </p>
      )}
    </div>
  );
};

export default AvatarUpload;
