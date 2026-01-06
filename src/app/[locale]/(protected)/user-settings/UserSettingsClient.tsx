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
import { useParams } from "next/navigation";
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
  const tCTA = useTranslations("cta");
  const tCommon = useTranslations("common");
  const tAI = useTranslations("assistant");
  const locale = useLocale();
  const { subscriptionPlan } = useSubscription();
  const CHECKOUT_URL = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_CHECKOUT_URL;

  // Appearance & App Controls
  const isPWAInstalled = useIsPWAInstalled();
  const [isUpgradeLoading, setIsUpgradeLoading] = useState(false);

  // Language state
  const [language, setLanguage] = useState<
    "en" | "uk" | "ru" | "hi" | "id" | "ja" | "ko"
  >("en");
  const [isSavingLang, setIsSavingLang] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

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

  async function handleUpgradeClick() {
    if (isUpgradeLoading) return;
    setIsUpgradeLoading(true);
    try {
      if (CHECKOUT_URL) {
        if (CHECKOUT_URL.includes("/checkout/buy/")) {
          console.warn(
            "[Settings] Env contains legacy buy URL; skipping to avoid 404.",
          );
          return;
        }
        window.location.href = CHECKOUT_URL;
        return;
      }

      const res = await fetch("/api/checkout-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      if (!res.ok) throw new Error("Failed to create checkout");

      const { url } = await res.json();
      if (typeof url !== "string" || url.includes("/checkout/buy/")) {
        console.warn(
          "[Settings] API returned legacy buy link or invalid URL; skipping to avoid 404.",
        );
        return;
      }

      window.location.href = url;
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
              <span
                className={`text-xs px-2 py-1 rounded border ${subscriptionPlan === "pro"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900"
                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900"
                  }`}
              >
                {tSettings("subscription.currentPlan")}:{" "}
                {subscriptionPlan === "pro"
                  ? tPricing("pro.label")
                  : tPricing("free.label")}
              </span>
            </div>

            {/* 4-Tier Pricing Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Free Plan */}
              <div className={`rounded-lg border-2 p-4 flex flex-col ${subscriptionPlan === "free" ? "border-gray-400 dark:border-gray-500 ring-2 ring-gray-300" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-card`}>
                <h3 className="font-semibold text-secondary-black dark:text-white mb-1">
                  {tPricing("free.label")}
                </h3>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-secondary-black dark:text-white">
                    $0
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    /forever
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300 mb-4 flex-1">
                  <li>• 3 budgets</li>
                  <li>• 10 AI messages/day</li>
                  <li>• Basic charts</li>
                </ul>
                <Button
                  text="Current Plan"
                  variant="outline"
                  className="w-full text-xs h-9"
                  disabled={subscriptionPlan === "free"}
                />
              </div>

              {/* Monthly Plan */}
              <div className="rounded-lg border-2 border-gray-200 dark:border-border p-4 bg-white dark:bg-card flex flex-col">
                <h3 className="font-semibold text-secondary-black dark:text-white mb-1">
                  Monthly
                </h3>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-secondary-black dark:text-white">
                    $7
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    /month
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-800 dark:text-white mb-4 flex-1">
                  <li>• Unlimited budgets</li>
                  <li>• Unlimited wallets</li>
                  <li>• Basic AI support</li>
                  <li>• All free features</li>
                </ul>
                <Button
                  text="Upgrade"
                  variant="primary"
                  className="w-full text-xs h-9"
                  onClick={handleUpgradeClick}
                  isLoading={isUpgradeLoading}
                  disabled={isUpgradeLoading}
                />
              </div>

              {/* Yearly Plan */}
              <div className="rounded-lg border-2 border-primary dark:border-primary p-4 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/15 relative">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold">
                    Best Value
                  </div>
                </div>
                <h3 className="font-semibold text-secondary-black dark:text-white mb-1 pt-6">
                  Yearly
                </h3>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-secondary-black dark:text-white">
                    $49
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    /year
                  </div>
                  <div className="text-[10px] text-primary">
                    ~$4.08/month
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-800 dark:text-white mb-4">
                  <li>• Everything in Monthly</li>
                  <li>• Priority support</li>
                  <li>• Early access</li>
                  <li>• Best value</li>
                </ul>
                <Button
                  text="Upgrade"
                  variant="primary"
                  className="w-full text-xs h-9"
                  onClick={handleUpgradeClick}
                  isLoading={isUpgradeLoading}
                  disabled={isUpgradeLoading}
                />
              </div>

              {/* Lifetime Plan */}
              <div className="rounded-lg border-2 border-amber-500 dark:border-amber-400 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 relative">
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-white text-[10px] font-semibold">
                    Founder's Edition
                  </div>
                </div>
                <h3 className="font-semibold text-secondary-black dark:text-white mb-1 pt-6">
                  Lifetime
                </h3>
                <div className="mb-3">
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    $99
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    one-time
                  </div>
                </div>
                <ul className="space-y-1.5 text-xs text-gray-800 dark:text-white mb-3">
                  <li>• Everything in Yearly</li>
                  <li>• Early Adopter Badge</li>
                  <li>• Lifetime updates</li>
                  <li>• Founder's Edition</li>
                </ul>
                <p className="text-[10px] text-gray-600 dark:text-gray-400 mb-3 text-center">
                  Fair Usage Policy applies
                </p>
                <Button
                  text="Get Lifetime"
                  variant="primary"
                  className="w-full text-xs h-9 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0"
                  onClick={handleUpgradeClick}
                  isLoading={isUpgradeLoading}
                  disabled={isUpgradeLoading}
                />
              </div>
            </div>
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
