"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UserAuth } from "@/context/AuthContext";
import useModal from "@/hooks/useModal";
import Button from "@/components/ui-elements/Button";
import SignOutModal from "@/components/modals/SignOutModal";
import EditProfileModal from "@/components/modals/EditProfileModal";
import NotificationSettings from "@/components/notifications/NotificationSettings";
import ProfileCard from "@/components/user-settings/ProfileCard";
import ThemeSwitcher from "@/components/ui-elements/ThemeSwitcher";
import useIsPWAInstalled from "@/hooks/useIsPWAInstalled";
import { useRouter, usePathname } from "@/i18n/routing";
import { supabase } from "@/lib/supabaseClient";
import LanguageSelect from "@/components/ui-elements/locale/LanguageSelect";
import { useTranslations, useLocale } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import ToneSettings from "@/components/ai-assistant/ToneSettings";
import { SupportSection } from "@/components/user-settings/SupportSection";
import InstallPWA from "@/components/pwa/InstallPWA";

import TransactionTemplatesSettings from "@/components/user-settings/TransactionTemplatesSettings";
import { useSubscription } from "@/hooks/useSubscription";
import UnsubscribeModal from "@/components/modals/UnsubscribeModal";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { LogOut } from "lucide-react";

export default function UserSettingsClient() {
  const { signOut, session } = UserAuth();
  const {
    isModalOpen: isSignOutModalOpen,
    openModal: openSignOutModal,
    closeModal: closeSignOutModal,
  } = useModal();
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  const handleEditProfile = () => setIsEditProfileModalOpen(true);
  const handleEditProfileClose = () => setIsEditProfileModalOpen(false);

  // Переводы
  const tSettings = useTranslations("userSettings");
  const tPricing = useTranslations("pricing");
  const tPaywall = useTranslations("paywall.comparison");
  const tCTA = useTranslations("cta");
  const tCommon = useTranslations("common");
  const tAI = useTranslations("assistant");
  const locale = useLocale();
  const { subscriptionPlan, isLoading: isSubscriptionLoading, paddleCustomerId } = useSubscription();

  // Appearance & App Controls
  const isPWAInstalled = useIsPWAInstalled();
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);
  const [isManageSubscriptionLoading, setIsManageSubscriptionLoading] = useState(false);

  // Language state
  const [language, setLanguage] = useState<
    "en" | "uk" | "ru" | "hi" | "id" | "ja" | "ko"
  >("en");
  const [isSavingLang, setIsSavingLang] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();

  // Unsubscribe modal state
  const [isUnsubscribeOpen, setIsUnsubscribeOpen] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const m = document.cookie.match(/(?:^|; )spendly_locale=([^;]+)/);
      const cookieLang = m ? decodeURIComponent(m[1]) : null;
      if (
        cookieLang &&
        ["en", "uk", "ru", "hi", "id", "ja", "ko"].includes(cookieLang)
      ) {
        setLanguage(cookieLang as any);
        document.documentElement.lang = cookieLang;
      }
    }
  }, []);

  useEffect(() => {
    const open = searchParams?.get("open");
    if (open === "notifications") {
      setIsNotificationsOpen(true);
    }
  }, [searchParams]);

  async function handleLanguageChange(next: typeof language) {
    setLanguage(next);
    document.documentElement.lang = next;
    document.cookie = `spendly_locale=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    document.cookie = `NEXT_LOCALE=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;

    // Переключаем локаль, оставаясь на странице настроек
    router.replace({ pathname, params: params as any }, { locale: next });
    router.refresh();

    if (session?.user?.id) {
      setIsSavingLang(true);
      try {
        const {
          data: { session: current },
        } = await supabase.auth.getSession();
        const token = current?.access_token;
        if (!token) throw new Error("No auth token");
        const resp = await fetch("/api/user/locale", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ locale: next }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          throw new Error(err.error || "Failed to save locale");
        }
      } catch (e) {
        console.error("Error saving locale:", e);
      } finally {
        setIsSavingLang(false);
      }
    }
  }

  async function handleUpgradeClick(plan: "monthly" | "yearly" | "lifetime" = "monthly") {
    if (isUpgradeLoading) return;
    setIsUpgradeLoading(true);
    try {
      const waitForPaddleInitialized = async (timeoutMs = 2000) => {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
          if ((window as any)?.__SPENDLY_PADDLE_INITIALIZED === true) return true;
          await new Promise((r) => setTimeout(r, 50));
        }
        return (window as any)?.__SPENDLY_PADDLE_INITIALIZED === true;
      };

      const fallback = (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || "").trim();
      const priceId = (
        plan === "monthly"
          ? (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY || "").trim()
          : plan === "yearly"
            ? (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_YEARLY || "").trim()
            : (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_LIFETIME || "").trim()
      ) || fallback;

      if (!priceId) {
        console.warn("[Settings] Missing Paddle priceId");
        return;
      }

      const paddle = (window as any)?.Paddle;
      if (!paddle?.Checkout?.open) {
        console.warn("[Settings] Paddle is not available on window yet");
        return;
      }

      const initialized = await waitForPaddleInitialized();
      if (!initialized) {
        console.warn("[Settings] Paddle is not initialized yet");
        return;
      }

      const nakedCheckout =
        (process.env.NEXT_PUBLIC_PADDLE_NAKED_CHECKOUT || "").trim() === "true";

      if (nakedCheckout) {
        const nakedPayload = { items: [{ priceId, quantity: 1 }] };
        console.log("[Settings] Opening naked checkout:", nakedPayload);
        paddle.Checkout.open(nakedPayload);
        return;
      }

      const userId = session?.user?.id;
      const customData: Record<string, string> = { plan };
      if (typeof userId === "string" && userId.length > 0) customData.user_id = userId;

      const checkoutPayload = {
        settings: {
          displayMode: "overlay",
          locale,
          theme: "light",
          successUrl: `${window.location.origin}/${locale}/checkout/success`,
        },
        items: [{ priceId, quantity: 1 }],
        customData,
      };
      console.log("[Settings] Opening checkout:", checkoutPayload);
      paddle.Checkout.open(checkoutPayload);
    } catch (e) {
      console.warn("[Settings] No checkout URL available:", e);
    } finally {
      setIsUpgradeLoading(false);
    }
  }

  async function handleConfirmUnsubscribe() {
    setIsUnsubscribing(true);
    try {
      await supabase.auth.updateUser({
        data: {
          subscription_status: "free",
          isPro: false,
          assistant_tone: "neutral",
        },
      });

      const userId = session?.user?.id;
      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "free", is_pro: false })
          .eq("id", userId);
        if (error) {
          console.warn("Error updating users subscription status:", error);
        }
      }
      await signOut();
      router.replace({ pathname: "/auth", query: { tab: "signup" } });
    } catch (e) {
      console.error("Error during unsubscribe:", e);
    } finally {
      setIsUnsubscribing(false);
      setIsUnsubscribeOpen(false);
    }
  }

  return (
    <>
      {isUpgradeLoading || isManageSubscriptionLoading ? (
        <div className="fixed inset-0 z-[1000] bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
          <span className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        </div>
      ) : null}

      <div className="flex flex-col gap-6 px-4 md:px-6 pb-8 w-full">
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
            {tSettings("header.title")}
          </motion.h1>
          <motion.p
            className="text-sm sm:text-base text-gray-600 dark:text-white mt-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          >
            {tSettings("header.subtitle")}
          </motion.p>
        </motion.div>

        {/* Settings Content */}
        <div className="space-y-6">
          {/* Profile Section */}
          <ProfileCard onEditProfile={handleEditProfile} />

          {/* Subscription Section — мобильный паддинг 12px */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-secondary-black dark:text-white">
                  {tSettings("subscription.title")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-white">
                  {tSettings("subscription.description")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isSubscriptionLoading ? (
                  <span className="h-6 w-[140px] rounded border bg-gray-100 dark:bg-muted animate-pulse" />
                ) : (
                  <span
                    className={`text-xs px-2 py-1 rounded border ${subscriptionPlan === "pro"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900"
                      : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900"
                      }`}
                  >
                    {tSettings("subscription.currentPlan")}: {" "}
                    {subscriptionPlan === "pro"
                      ? tPricing("pro.label")
                      : tPricing("free.label")}
                  </span>
                )}
                {!isSubscriptionLoading && subscriptionPlan === "pro" && typeof paddleCustomerId === "string" && paddleCustomerId.length > 0 ? (
                  <div className="hidden md:block">
                    <Button
                      text={tSettings("subscription.manageSubscription")}
                      variant="default"
                      className="h-8 px-3 text-xs"
                      disabled={isManageSubscriptionLoading}
                      isLoading={isManageSubscriptionLoading}
                      onClick={async () => {
                        if (isManageSubscriptionLoading) return;
                        setIsManageSubscriptionLoading(true);
                        try {
                          const { data: { session: current } } = await supabase.auth.getSession();
                          const token = current?.access_token;
                          if (!token) return;
                          const resp = await fetch("/api/paddle/customer-portal", {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({}),
                          });
                          if (!resp.ok) {
                            const errText = await resp.text().catch(() => "");
                            console.error("[Settings] Failed to open customer portal", {
                              status: resp.status,
                              body: errText,
                            });
                            return;
                          }
                          const json = (await resp.json().catch(() => null)) as { url?: string } | null;
                          const url = typeof json?.url === "string" ? json.url : "";
                          if (!url) return;
                          const w = window.open(url, "_blank", "noopener,noreferrer");
                          if (!w) window.location.href = url;
                        } finally {
                          setIsManageSubscriptionLoading(false);
                        }
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>

            {isSubscriptionLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="h-[220px] rounded-lg border bg-gray-50 dark:bg-muted animate-pulse" />
                <div className="h-[220px] rounded-lg border bg-gray-50 dark:bg-muted animate-pulse" />
                <div className="h-[220px] rounded-lg border bg-gray-50 dark:bg-muted animate-pulse" />
                <div className="h-[220px] rounded-lg border bg-gray-50 dark:bg-muted animate-pulse" />
              </div>
            ) : subscriptionPlan === "free" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className={`rounded-lg border-2 p-4 flex flex-col ${subscriptionPlan === "free" ? "border-gray-400 dark:border-gray-500 ring-2 ring-gray-300" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-card`}>
                  <h3 className="font-semibold text-secondary-black dark:text-white mb-1">
                    {tPaywall("free.label")}
                  </h3>
                  <div className="mb-3">
                    <div className="text-2xl font-bold text-secondary-black dark:text-white">
                      $0
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tPaywall("free.period")}
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 mb-4 flex-1">
                    <li>• {tPaywall("free.feature1")}</li>
                    <li>• {tPaywall("free.feature3")}</li>
                    <li>• {tPaywall("free.feature4")}</li>
                  </ul>
                  <Button
                    text={tPaywall("free.cta")}
                    variant="outline"
                    className="w-full text-xs h-9"
                    disabled={subscriptionPlan === "free"}
                  />
                </div>

                <div className="rounded-lg border-2 border-gray-200 dark:border-border p-4 bg-white dark:bg-card flex flex-col">
                  <h3 className="font-semibold text-secondary-black dark:text-white mb-1">
                    {tPaywall("monthly.label")}
                  </h3>
                  <div className="mb-3">
                    <div className="text-2xl font-bold text-secondary-black dark:text-white">
                      {tPaywall("monthly.price")}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tPaywall("monthly.period")}
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-800 dark:text-white mb-4 flex-1">
                    <li>• {tPaywall("monthly.feature1")}</li>
                    <li>• {tPaywall("monthly.feature2")}</li>
                    <li>• {tPaywall("monthly.feature3")}</li>
                    <li>• {tPaywall("monthly.feature4")}</li>
                  </ul>
                  <Button
                    text={tPaywall("monthly.cta")}
                    variant="primary"
                    className="w-full text-xs h-9"
                    onClick={() => handleUpgradeClick("monthly")}
                    isLoading={isUpgradeLoading}
                    disabled={isUpgradeLoading}
                  />
                </div>

                <div className="rounded-lg border-2 border-primary dark:border-primary p-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/15 relative">
                  <div className="absolute top-2 right-2">
                    <div className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold">
                      {tPaywall("bestValue")}
                    </div>
                  </div>
                  <h3 className="font-semibold text-secondary-black dark:text-white mb-1 pt-6">
                    {tPaywall("yearly.label")}
                  </h3>
                  <div className="mb-3">
                    <div className="text-2xl font-bold text-secondary-black dark:text-white">
                      {tPaywall("yearly.price")}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {tPaywall("yearly.period")}
                    </div>
                    <div className="text-[10px] text-primary">
                      {tPaywall("yearly.priceNote")}
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-800 dark:text-white mb-4">
                    <li>• {tPaywall("yearly.feature1")}</li>
                    <li>• {tPaywall("yearly.feature2")}</li>
                    <li>• {tPaywall("yearly.feature3")}</li>
                    <li>• {tPaywall("yearly.feature4")}</li>
                  </ul>
                  <Button
                    text={tPaywall("yearly.cta")}
                    variant="primary"
                    className="w-full text-xs h-9"
                    onClick={() => handleUpgradeClick("yearly")}
                    isLoading={isUpgradeLoading}
                    disabled={isUpgradeLoading}
                  />
                </div>

                <div className="rounded-lg border-2 border-amber-500 dark:border-amber-400 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 relative">
                  <div className="absolute top-2 right-2">
                    <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-semibold">
                      {tPaywall("foundersEdition")}
                    </div>
                  </div>
                  <h3 className="font-semibold text-secondary-black dark:text-white mb-1 pt-6">
                    {tPaywall("lifetime.label")}
                  </h3>
                  <div className="mb-3">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {tPaywall("lifetime.price")}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {tPaywall("lifetime.period")}
                    </div>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-800 dark:text-white mb-3">
                    <li>• {tPaywall("lifetime.feature1")}</li>
                    <li>• {tPaywall("lifetime.feature2")}</li>
                    <li>• {tPaywall("lifetime.feature3")}</li>
                    <li>• {tPaywall("lifetime.feature4")}</li>
                  </ul>
                  <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-3 text-center">
                    {tPaywall("lifetime.fairUsage")}
                  </p>
                  <Button
                    text={tPaywall("lifetime.cta")}
                    variant="primary"
                    className="w-full text-xs h-9 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0"
                    onClick={() => handleUpgradeClick("lifetime")}
                    isLoading={isUpgradeLoading}
                    disabled={isUpgradeLoading}
                  />
                </div>
              </div>
            ) : null}

            {/* Manage Subscription Button - Mobile Only */}
            {!isSubscriptionLoading && subscriptionPlan === "pro" && typeof paddleCustomerId === "string" && paddleCustomerId.length > 0 && (
              <div className="mt-6 md:hidden">
                <Button
                  text={tSettings("subscription.manageSubscription")}
                  variant="default"
                  className="w-full"
                  disabled={isManageSubscriptionLoading}
                  isLoading={isManageSubscriptionLoading}
                  onClick={async () => {
                    if (isManageSubscriptionLoading) return;
                    setIsManageSubscriptionLoading(true);
                    try {
                      const { data: { session: current } } = await supabase.auth.getSession();
                      const token = current?.access_token;
                      if (!token) return;
                      const resp = await fetch("/api/paddle/customer-portal", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({}),
                      });
                      if (!resp.ok) {
                        const errText = await resp.text().catch(() => "");
                        console.error("[Settings] Failed to open customer portal", {
                          status: resp.status,
                          body: errText,
                        });
                        return;
                      }
                      const json = (await resp.json().catch(() => null)) as { url?: string } | null;
                      const url = typeof json?.url === "string" ? json.url : "";
                      if (!url) return;
                      const w = window.open(url, "_blank", "noopener,noreferrer");
                      if (!w) window.location.href = url;
                    } finally {
                      setIsManageSubscriptionLoading(false);
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Language Section — мобильный паддинг 12px */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary-black dark:text-white">
                  {tSettings("language.title")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-white">
                  {tSettings("language.description")}
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
                    {tCommon("saving")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Appearance Section — мобильный паддинг 12px */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary-black dark:text-white mb-2">
                  {tSettings("appearance.title")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-white">
                  {tSettings("appearance.description")}
                </p>
              </div>
              <ThemeSwitcher />
            </div>
          </div>

          {/* Notifications Section — теперь открывается в Sheet */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-secondary-black mb-2 dark:text-white">
                  {tSettings("notifications.title")}
                </h2>
                <p className="text-gray-600 dark:text-white text-sm">
                  {tSettings("notifications.description")}
                </p>
              </div>
              <Button
                text={tSettings("notifications.title")}
                variant="default"
                onClick={() => setIsNotificationsOpen(true)}
              />
            </div>
          </div>

          {/* Transaction Templates Section — мобильный паддинг 12px */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <TransactionTemplatesSettings />
          </div>

          {/* Assistant Tone Section — мобильный паддинг 12px */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-secondary-black dark:text-white">
                {tAI("settings.title")}
              </h2>
              <p className="text-sm text-gray-600 dark:text-white mt-1">
                {tAI("settings.description")}
              </p>
            </div>
            <ToneSettings />
          </div>

          {!isPWAInstalled && (
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-secondary-black dark:text-white mb-2">
                    {tSettings("appControls.title")}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-white">
                    {tSettings("appControls.description")}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <InstallPWA />
                </div>
              </div>
            </div>
          )}

          {/* Support Section — mobile padding 12px */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <SupportSection />
          </div>

          {/* Account Section — мобильный паддинг 12px и без нижнего дивайдера */}
          <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-secondary-black mb-4 dark:text-white">
                  {tSettings("account.title")}
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <h3 className="font-medium text-secondary-black dark:text-white">
                        {tSettings("account.signOut.title")}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-white">
                        {tSettings("account.signOut.description")}
                      </p>
                    </div>
                    <Button
                      text={tCTA("signOut")}
                      variant="ghost"
                      icon={<LogOut size={16} />}
                      onClick={openSignOutModal}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone Section — мобильный паддинг 12px */}
          {subscriptionPlan === "pro" && (
            <div className="bg-white dark:bg-card rounded-lg border border-gray-200 dark:border-border p-3 md:p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                  {tSettings("dangerZone.title")}
                </h2>
                <p className="text-sm text-gray-600 dark:text-white">
                  {tSettings("dangerZone.description")}
                </p>
              </div>
              <Button
                text={tSettings("dangerZone.unsubscribe")}
                variant="destructive"
                onClick={() => setIsUnsubscribeOpen(true)}
              />
            </div>
          )}
        </div>
      </div>

      {/* Sign Out Modal */}
      {isSignOutModalOpen && (
        <SignOutModal
          title={tSettings("modals.signOut.title")}
          text={tSettings("modals.signOut.text")}
          onClose={closeSignOutModal}
          signOut={signOut}
        />
      )}

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={handleEditProfileClose}
        onSuccess={() => { }}
      />

      {/* Unsubscribe Modal */}
      {isUnsubscribeOpen && (
        <UnsubscribeModal
          open={isUnsubscribeOpen}
          onClose={() => setIsUnsubscribeOpen(false)}
          onConfirm={handleConfirmUnsubscribe}
          isLoading={isUnsubscribing}
        />
      )}

      {/* Notifications Sheet */}
      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent
          side="bottom"
          className="bg-background text-foreground h-[75vh] flex flex-col overflow-hidden p-0"
        >
          <SheetHeader className="px-4 py-4 border-b border-border justify-center">
            <SheetTitle className="text-[18px] sm:text-[20px] font-semibold text-center">
              {tSettings("notifications.title")}
            </SheetTitle>
          </SheetHeader>
          <div
            className="p-4 flex-1 overflow-y-auto overscroll-y-contain"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}
          >
            <NotificationSettings />
          </div>
          <SheetFooter className="px-4 py-3 border-t border-border">
            <SheetClose className="h-10 px-4 w-full rounded-md border border-input bg-background text-sm text-center">
              {tCommon("close")}
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
