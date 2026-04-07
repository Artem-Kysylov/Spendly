"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/use-toast";
import { processUserRecurringTransactions } from "@/app/[locale]/actions/recurring";

/**
 * RecurringSync Component
 * Silently processes recurring transactions on app boot
 * Shows toast notification if push notifications are disabled or failed
 */
export function RecurringSync() {
  const { toast } = useToast();
  const t = useTranslations("recurring.toast");

  useEffect(() => {
    let mounted = true;

    const syncRecurringTransactions = async () => {
      try {
        const result = await processUserRecurringTransactions();

        if (!mounted) return;

        // Show toast ONLY if:
        // 1. Transactions were generated
        // 2. Push notifications are disabled OR failed
        if (result.generated > 0 && result.shouldShowToast) {
          if (result.generated === 1 && result.transactionName) {
            toast({
              title: t("single", { name: result.transactionName }),
              variant: "success",
              duration: 5000,
            });
          } else {
            toast({
              title: t("multiple", { count: result.generated }),
              variant: "success",
              duration: 5000,
            });
          }
        }

        if (result.errors.length > 0) {
          console.error("RecurringSync errors:", result.errors);
        }
      } catch (err) {
        console.error("RecurringSync error:", err);
      }
    };

    // Run once on mount
    syncRecurringTransactions();

    return () => {
      mounted = false;
    };
  }, [toast, t]);

  return null; // Silent background component
}
