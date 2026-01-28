"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Button from "@/components/ui-elements/Button";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import type { ToastMessageProps } from "@/types/types";
import { useTranslations, useLocale } from "next-intl";
import { UserAuth } from "@/context/AuthContext";

export default function PaymentClient() {
  const [toast, setToast] = useState<ToastMessageProps | null>(null);
  const tPayment = useTranslations("payment");
  const tPricing = useTranslations("pricing");
  const tCTA = useTranslations("cta");
  const locale = useLocale();
  const { session } = UserAuth();

  const handleUpgradeClick = async () => {
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
      const priceId = (process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_MONTHLY || "").trim() ||
        fallback;

      if (!priceId) {
        console.warn("[Payment] Missing Paddle priceId");
        setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
        setTimeout(() => setToast(null), 3000);
        return;
      }

      const paddle = (window as any)?.Paddle;
      if (!paddle?.Checkout?.open) {
        console.warn("[Payment] Paddle is not available on window yet");
        setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
        setTimeout(() => setToast(null), 3000);
        return;
      }

      const initialized = await waitForPaddleInitialized();
      if (!initialized) {
        console.warn("[Payment] Paddle is not initialized yet");
        setToast({ text: "Checkout is unavailable. Please try again.", type: "error" });
        setTimeout(() => setToast(null), 3000);
        return;
      }

      const nakedCheckout =
        (process.env.NEXT_PUBLIC_PADDLE_NAKED_CHECKOUT || "").trim() === "true";

      if (nakedCheckout) {
        paddle.Checkout.open({
          items: [{ priceId, quantity: 1 }],
        });
        return;
      }

      const userId = session?.user?.id;
      const customData: Record<string, string> = { plan: "monthly" };
      if (typeof userId === "string" && userId.length > 0) customData.user_id = userId;

      paddle.Checkout.open({
        settings: {
          displayMode: "overlay",
          locale,
          theme: "light",
        },
        items: [{ priceId, quantity: 1 }],
        customData,
      });
    } catch (e) {
      console.warn("[Payment] Paddle checkout failed:", e);
      setToast({ text: "Checkout failed. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 3000);
    }
  };

  return (
    <div key={locale} className="container mx-auto px-4 py-10">
      {toast && <ToastMessage text={toast.text} type={toast.type} />}

      <motion.div
        className="text-center mb-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <h1 className="text-[28px] md:text-[34px] font-semibold text-secondary-black dark:text-white">
          {tPayment("title")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {tPayment("subtitle")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
        {/* Free Plan */}
        <motion.div
          className="rounded-lg border border-gray-200 dark:border-border p-6 bg-white dark:bg-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
        >
          <h3 className="font-medium text-secondary-black dark:text-white">
            {tPricing("free.label")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {tPricing("free.short")}
          </p>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-secondary-black dark:text-white">
              $0
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {tPricing("perMonth")}
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-white">
            <li>• {tPricing("free.features.trackExpenses")}</li>
            <li>• {tPricing("free.features.basicCharts")}</li>
            <li>• {tPricing("free.features.localNotifications")}</li>
          </ul>
        </motion.div>

        {/* Pro Plan */}
        <motion.div
          className="rounded-lg border border-primary dark:border-primary p-6 bg-primary/5 dark:bg-primary/10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
        >
          <h3 className="font-medium text-secondary-black dark:text-white">
            {tPricing("pro.label")}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            {tPricing("pro.short")}
          </p>
          <div className="mt-4">
            <div className="text-2xl font-semibold text-secondary-black dark:text-white">
              $7
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {tPricing("perMonth")}
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-gray-800 dark:text-white">
            <li>• {tPricing("pro.features.aiUnlimited")}</li>
            <li>• {tPricing("pro.features.advancedCharts")}</li>
            <li>• {tPricing("pro.features.prioritySupport")}</li>
            <li>• {tPricing("pro.features.customGoals")}</li>
            <li>• {tPricing("pro.features.earlyAccess")}</li>
          </ul>
          <div className="mt-5">
            <Button
              text={tCTA("upgradeToPro")}
              variant="primary"
              onClick={handleUpgradeClick}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
