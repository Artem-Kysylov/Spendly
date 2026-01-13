// Хук: useNotificationSettings
"use client";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import type {
  NotificationSettings,
  UseNotificationSettingsReturn,
} from "@/types/types";
import { useLocale } from "next-intl";

export const useNotificationSettings = (): UseNotificationSettingsReturn => {
  const { session, isReady } = UserAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const locale = useLocale();
  const apiBase = `/${locale}/api/notifications`;

  // Получение токена для API запросов
  const getAuthToken = useCallback(async () => {
    if (!session) return null;
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    return currentSession?.access_token || null;
  }, [session]);

  const fetchSettings = useCallback(async () => {
    // Ждем готовности контекста аутентификации
    if (!isReady) {
      return;
    }

    if (!session?.user?.id) {
      console.log("No user session found");
      setError(
        "Пользователь не аутентифицирован. Войдите в систему для доступа к настройкам уведомлений.",
      );
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching notification settings for user:", session.user.id);

      const token = await getAuthToken();
      if (!token) {
        throw new Error("No auth token available");
      }

      const response = await fetch(`${apiBase}/preferences`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as any).error || "Failed to fetch settings");
      }

      const { settings: fetchedSettings } = await response.json();
      console.log("Settings fetched via API:", fetchedSettings);
      setSettings(fetchedSettings);
    } catch (err) {
      console.error("Error fetching notification settings:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch settings");
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id, isReady, getAuthToken, apiBase]);

  const updateSettings = useCallback(
    async (updates: Partial<NotificationSettings>) => {
      if (!session?.user?.id || !settings) return;

      const prev = settings;
      try {
        // Оптимистичное обновление UI
        setSettings({ ...prev, ...updates });

        const token = await getAuthToken();
        if (!token) {
          setSettings(prev);
          throw new Error("No auth token available");
        }

        const response = await fetch(`${apiBase}/preferences`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            frequency: updates.frequency ?? prev.frequency,
            push_enabled: updates.push_enabled ?? prev.push_enabled,
            email_enabled: updates.email_enabled ?? prev.email_enabled,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setSettings(prev);
          throw new Error(
            (errorData as any).error || "Failed to update settings",
          );
        }

        const { settings: updated } = await response.json();
        setSettings(updated as NotificationSettings);
      } catch (err) {
        console.error("Error updating notification settings:", err);
        throw err;
      }
    },
    [session?.user?.id, settings, getAuthToken, apiBase],
  );

  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    // Optimistic on
    const prev = settings;
    if (settings) {
      setSettings({ ...settings, push_enabled: true });
    }

    // Проверка поддержки
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications not supported");
      if (prev) setSettings(prev);
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        console.error("Permission for notifications was not granted.");
        setSettings((prev) => (prev ? { ...prev, push_enabled: false } : prev));
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error("VAPID public key not found.");
        return false;
      }

      const keyUint8 = urlBase64ToUint8Array(vapidKey);

      const subscription = await withTimeout(
        (async () => {
          const existing = await registration.pushManager.getSubscription();
          const existingKey = existing?.options?.applicationServerKey;
          if (existing && existingKey) {
            const existingUint8 = new Uint8Array(existingKey as ArrayBuffer);
            if (!areUint8ArraysEqual(existingUint8, keyUint8)) {
              try {
                await existing.unsubscribe();
              } catch {}
            }
          }

          const attemptSubscribe = async () =>
            registration.pushManager.subscribe({
              userVisibleOnly: true,
              // Передаём ArrayBuffer (совместим с типом BufferSource)
              applicationServerKey: keyUint8.buffer as ArrayBuffer,
            });

          try {
            return await attemptSubscribe();
          } catch (e) {
            await registration.pushManager
              .getSubscription()
              .then((sub) => sub?.unsubscribe())
              .catch(() => {});
            return await attemptSubscribe();
          }
        })(),
        10_000,
      );

      const token = await getAuthToken();
      if (!token) {
        if (prev) setSettings(prev);
        throw new Error("No auth token available");
      }

      const response = await fetch(`${apiBase}/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (prev) setSettings(prev);
        throw new Error(
          (errorData as any).error || "Failed to save push subscription",
        );
      }

      console.log("Push subscription saved successfully");
      return true;
    } catch (err) {
      console.error("Error subscribing to push notifications:", err);
      if (prev) setSettings(prev);
      return false;
    }
  }, [getAuthToken, settings, apiBase]);

  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    // Optimistic off
    const prev = settings;
    if (settings) {
      setSettings({ ...settings, push_enabled: false });
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();

        const token = await getAuthToken();
        if (!token) {
          if (prev) setSettings(prev);
          throw new Error("No auth token available");
        }

        const response = await fetch(`${apiBase}/subscribe`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (prev) setSettings(prev);
          throw new Error(
            (errorData as any).error || "Failed to remove push subscription",
          );
        }

        console.log("Push subscription removed successfully");
      }

      return true;
    } catch (err) {
      console.error("Error unsubscribing from push notifications:", err);
      if (prev) setSettings(prev);
      return false;
    }
  }, [getAuthToken, settings, apiBase]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    subscribeToPush,
    unsubscribeFromPush,
  };
};

// Помощник: Base64Url → Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined"
      ? window.atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function areUint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  for (let i = 0; i < a.byteLength; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Push subscription timeout")), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}
