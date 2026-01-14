"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { UserAuth } from "@/context/AuthContext";
import DatabaseSetupInstructions from "./DatabaseSetupInstructions";
import type {
  NotificationFrequency,
  NotificationFrequencyOption,
  ToastMessageProps,
} from "@/types/types";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import Spinner from "@/components/ui-elements/Spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/lib/supabaseClient";
import { useLocale } from "next-intl";

const NotificationSettings = () => {
  const { session, isReady } = UserAuth();
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    subscribeToPush,
    unsubscribeFromPush,
  } = useNotificationSettings();

  const [isUpdatingFrequency, setIsUpdatingFrequency] = useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = useState(false);
  const [toast, setToast] = useState<ToastMessageProps | null>(null);
  const [isIOSBrowser, setIsIOSBrowser] = useState(false);
  const [isSendingTestPush, setIsSendingTestPush] = useState(false);
  const [testPushResult, setTestPushResult] = useState<{
    success: boolean;
    message: string;
    details?: unknown;
  } | null>(null);
  const locale = useLocale();

  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default",
  );

  const tN = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const { subscriptionPlan } = useSubscription();
  const isPro = subscriptionPlan === "pro";

  const showPushDebug =
    process.env.NEXT_PUBLIC_ENABLE_PUSH_DEBUG === "true";

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    setIsIOSBrowser(isIOS && !isStandalone);
  }, []);

  const frequencyOptions: NotificationFrequencyOption[] = [
    {
      value: "disabled",
      label: tN("frequency.disabled.label"),
      description: tN("frequency.disabled.description"),
      emoji: "😴",
    },
    {
      value: "gentle",
      label: tN("frequency.gentle.label"),
      description: tN("frequency.gentle.description"),
      emoji: "🤗",
    },
    {
      value: "aggressive",
      label: tN("frequency.aggressive.label"),
      description: tN("frequency.aggressive.description"),
      emoji: "😤",
    },
    {
      value: "relentless",
      label: tN("frequency.relentless.label"),
      description: tN("frequency.relentless.description"),
      emoji: "🤯",
    },
  ];

  const handleFrequencyChange = async (frequency: NotificationFrequency) => {
    if (!settings || isUpdatingFrequency) return;

    try {
      setIsUpdatingFrequency(true);
      await updateSettings({ frequency, push_enabled: settings.push_enabled });
      setToast({ text: tN("toasts.preferencesSaved"), type: "success" });
    } catch (err) {
      console.error("Failed to update frequency:", err);
      setToast({ text: tN("toasts.preferencesSaveFailed"), type: "error" });
    } finally {
      setIsUpdatingFrequency(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!settings || isUpdatingPush) return;

    try {
      setIsUpdatingPush(true);
      const success = await (enabled
        ? subscribeToPush()
        : unsubscribeFromPush());

      setPermission(
        typeof Notification !== "undefined"
          ? Notification.permission
          : "default",
      );

      if (success) {
        setToast({
          text: enabled ? tN("toasts.pushEnabled") : tN("toasts.pushDisabled"),
          type: "success",
        });
      } else {
        setToast({
          text: enabled
            ? "Please reset permissions or clear cache."
            : tN("toasts.pushStatusFailed"),
          type: "error",
        });
      }
    } catch (err) {
      console.error("Failed to toggle push notifications:", err);
      setToast({
        text: enabled
          ? "Please reset permissions or clear cache."
          : tN("toasts.pushStatusFailed"),
        type: "error",
      });
    } finally {
      setIsUpdatingPush(false);
    }
  };

  async function handleRetrySubscribe() {
    try {
      setIsUpdatingPush(true);
      const ok = await subscribeToPush();
      setPermission(
        typeof Notification !== "undefined"
          ? Notification.permission
          : "default",
      );

      if (ok) {
        setToast({ text: tN("toasts.pushEnabled"), type: "success" });
      } else {
        setToast({ text: tN("toasts.pushStatusFailed"), type: "error" });
      }

      setTimeout(() => setToast(null), 2500);
    } finally {
      setIsUpdatingPush(false);
    }
  }

  async function handleSendTestPush() {
    if (isSendingTestPush) return;

    try {
      setIsSendingTestPush(true);
      setTestPushResult(null);

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const token = currentSession?.access_token;

      if (!token) {
        setTestPushResult({
          success: false,
          message: "Not authenticated. Please sign in again.",
        });
        return;
      }

      const response = await fetch(`/${locale}/api/notifications/test-push`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTestPushResult({
          success: true,
          message: data.message || "Test push sent!",
          details: data.processor,
        });
        setToast({ text: "Test push sent! Check your device.", type: "success" });
      } else {
        setTestPushResult({
          success: false,
          message: data.error || data.message || "Failed to send test push",
          details: data,
        });
        setToast({ text: data.error || "Test push failed", type: "error" });
      }
    } catch (err) {
      console.error("Test push error:", err);
      setTestPushResult({
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
      });
      setToast({ text: "Test push failed", type: "error" });
    } finally {
      setIsSendingTestPush(false);
    }
  }

  // Требуется вход
  if (isReady && !session) {
    return (
      <div>
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
            {tN("authRequired.title")}
          </h3>
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
            {tN("authRequired.description")}
          </p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="text-sm bg-blue-100 dark:bg-blue-900 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-800 dark:text-blue-100 px-3 py-1 rounded transition-colors"
          >
            {tN("authRequired.signIn")}
          </button>
        </div>
      </div>
    );
  }

  // Инструкции по настройке БД (если нет таблиц)
  if (
    error &&
    (error.includes("relation") ||
      error.includes("table") ||
      error.includes("does not exist"))
  ) {
    return (
      <div>
        <DatabaseSetupInstructions />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
            Ошибка загрузки настроек
          </h3>
          <p className="text-red-700 dark:text-red-300 text-sm mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-100 px-3 py-1 rounded transition-colors"
          >
            Обновить страницу
          </button>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div>
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">
            Не удалось загрузить настройки уведомлений
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 text-sm bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative space-y-6"
      aria-busy={isUpdatingFrequency || isUpdatingPush}
    >
      {/* Тосты */}
      {toast && <ToastMessage {...toast} />}

      {/* Оверлей загрузки при апдейте */}
      {(isUpdatingFrequency || isUpdatingPush) && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner />
            <span>
              {isUpdatingPush
                ? "Preparing notifications..."
                : tCommon("saving")}
            </span>
          </div>
        </div>
      )}

      {isUpdatingFrequency || isUpdatingPush ? (
        <>
          {/* Push toggle skeleton */}
          <div className="py-3">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-10 w-full" />
          </div>

          {/* Frequency options skeletons */}
          <div>
            <Skeleton className="h-6 w-64 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Блок с информацией о дайджесте Free/Pro и CTA */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{tN("weekly.title")}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {isPro ? tN("weekly.bodyPro") : tN("weekly.bodyFree")}
                </div>
              </div>
              {!isPro && (
                <Link
                  href="/payment"
                  className="text-xs underline text-primary"
                >
                  {tN("weekly.ctaUpgrade")}
                </Link>
              )}
            </div>
          </div>

          {/* Push Notifications Toggle */}
          <div className="flex items-start justify-between py-3 border-b border-border gap-4">
            <div className="flex-1">
              <h3 className="font-medium text-foreground">
                {tN("settings.push.title")}
              </h3>
              <p className="text-sm text-foreground">
                {tN("settings.push.description")}
              </p>
              {/* Удалено: Статус разрешения */}
              {/* <div className="mt-2 text-xs text-muted-foreground">
                  Статус разрешения: <span className="font-medium">{permission}</span>
                </div> */}
              {permission === "denied" && (
                <div className="mt-2 text-xs bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900 rounded p-2">
                  {tN("permission_denied")}
                  <div className="mt-1">
                    Откройте настройки сайта → Разрешения → Уведомления и
                    включите.
                  </div>
                </div>
              )}

              {isIOSBrowser && (
                <div className="mt-3 rounded-lg border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-900 dark:text-yellow-100">
                  <div className="font-medium">
                    To enable notifications on iPhone, you must add this app to your Home Screen.
                  </div>
                  <div className="mt-1 text-xs">
                    Tap the Share icon (box with arrow) → Select "Add to Home Screen".
                  </div>
                </div>
              )}
            </div>

            {!isIOSBrowser && (
              <Switch
                checked={settings.push_enabled}
                onCheckedChange={handlePushToggle}
                disabled={isUpdatingPush}
                aria-label={tN("a11y.togglePush")}
                className="
                  border border-gray-300 dark:border-border
                  data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-neutral-800
                  data-[state=checked]:bg-primary
                "
                thumbClassName="bg-white dark:bg-white shadow-sm"
              />
            )}
          </div>

          {/* Send Test Push Button - visible when push is enabled */}
          {showPushDebug && settings.push_enabled && (
            <div className="py-3 border-b border-border">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-foreground">
                    Test Push Notification
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Send a test push to verify your VAPID keys and delivery pipeline.
                  </p>
                </div>
                <button
                  onClick={handleSendTestPush}
                  disabled={isSendingTestPush}
                  className="
                    px-4 py-2 text-sm font-medium rounded-lg
                    bg-primary text-primary-foreground
                    hover:bg-primary/90
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors
                    flex items-center gap-2
                  "
                >
                  {isSendingTestPush ? (
                    <>
                      <Spinner />
                      Sending...
                    </>
                  ) : (
                    "Send Test Push"
                  )}
                </button>
              </div>

              {/* Test Push Result */}
              {testPushResult && (
                <div
                  className={`mt-3 p-3 rounded-lg text-sm ${
                    testPushResult.success
                      ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-900"
                      : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900"
                  }`}
                >
                  <div className="font-medium">
                    {testPushResult.success ? "✓ Success" : "✗ Failed"}
                  </div>
                  <div className="mt-1">{testPushResult.message}</div>
                  {testPushResult.details !== undefined && testPushResult.details !== null && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs opacity-70">
                        Show details
                      </summary>
                      <pre className="mt-1 text-xs overflow-auto max-h-32 bg-black/5 dark:bg-white/5 p-2 rounded">
                        {JSON.stringify(testPushResult.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Frequency Settings */}
          <div>
            <h3 className="font-medium text-foreground mb-4">
              {tN("frequency.title")}
            </h3>
            <div
              role="radiogroup"
              aria-label={tN("frequency.aria")}
              className="space-y-3"
            >
              {frequencyOptions.map((option) => (
                <div
                  key={option.value}
                  role="radio"
                  aria-checked={settings.frequency === option.value}
                  tabIndex={0}
                  aria-describedby={`desc-${option.value}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleFrequencyChange(option.value);
                    }
                  }}
                  onClick={() => handleFrequencyChange(option.value)}
                  className={`
                    p-4 rounded-lg border-2 transition-all duration-200
                    ${settings.frequency === option.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}
                    ${isUpdatingFrequency ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    hover:shadow-sm hover:scale-[1.01]
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.emoji}</span>
                    <div className="flex-1">
                      <div className="font-medium text-foreground">
                        {option.label}
                      </div>
                      <div
                        id={`desc-${option.value}`}
                        className="text-sm text-muted-foreground"
                      >
                        {option.description}
                      </div>
                    </div>
                    {settings.frequency === option.value && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg
                          className="w-3 h-3 text-primary-foreground"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {/* Debug Info блок отсутствует */}
    </div>
  );
};

export default NotificationSettings;
