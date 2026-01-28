"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import Button from "@/components/ui-elements/Button";
import { UserAuth } from "@/context/AuthContext";

export default function CheckoutSuccessPage({
  params,
}: {
  params: { locale: string };
}) {
  const router = useRouter();
  const { locale } = params;
  const tPayment = useTranslations("payment");
  const { session, isReady } = UserAuth();

  useEffect(() => {
    if (!isReady) return;

    const token = session?.access_token;
    if (!token) return;

    let cancelled = false;
    const start = Date.now();

    const check = async () => {
      try {
        const res = await fetch("/api/subscription-status", {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;
        const json = (await res.json().catch(() => null)) as
          | { is_pro?: boolean; subscription_status?: string }
          | null;

        if (cancelled) return;
        if (json?.is_pro === true) {
          router.replace(`/${locale}/dashboard`);
        }
      } catch {
      }
    };

    void check();
    const interval = window.setInterval(() => {
      if (cancelled) return;
      if (Date.now() - start > 90_000) {
        window.clearInterval(interval);
        return;
      }
      void check();
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isReady, locale, router, session?.access_token]);

  const handleGoDashboard = () => {
    router.push(`/${locale}/dashboard`);
  };

  return (
    <div className="container mx-auto px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-[28px] md:text-[34px] font-semibold text-secondary-black dark:text-white">
          {tPayment("successTitle")}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-300">
          {tPayment("successMessage")}
        </p>
        <div className="mt-6 flex justify-center">
          <Button
            text={tPayment("goToDashboard")}
            variant="primary"
            onClick={handleGoDashboard}
          />
        </div>
      </motion.div>
    </div>
  );
}
