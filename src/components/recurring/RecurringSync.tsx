"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/use-toast";
import { UserAuth } from "@/context/AuthContext";
import { processUserRecurringTransactions } from "@/app/[locale]/actions/recurring";

/**
 * RecurringSync Component
 * Silently processes recurring transactions on app boot
 * Shows toast notification if push notifications are disabled or failed
 */
export function RecurringSync() {
  const { toast } = useToast();
  const t = useTranslations("recurring.toast");
  const tCommon = useTranslations("common");
  const { session } = UserAuth();

  useEffect(() => {
    let mounted = true;

    const syncRecurringTransactions = async () => {
      // Wait for session to be ready
      if (!session?.user?.id) {
        console.log("[RecurringSync] No session yet, skipping sync");
        return;
      }

      console.log("[RecurringSync] Starting sync for user:", session.user.id);
      
      try {
        const result = await processUserRecurringTransactions();

        console.log("[RecurringSync] Result:", {
          generated: result.generated,
          skipped: result.skipped,
          shouldShowToast: result.shouldShowToast,
          errors: result.errors,
        });

        if (!mounted) {
          console.log("[RecurringSync] Component unmounted, skipping UI updates");
          return;
        }

        // Show toast ONLY if:
        // 1. Transactions were generated
        // 2. Push notifications are disabled OR failed
        if (result.generated > 0 && result.shouldShowToast) {
          if (result.generated === 1 && result.transactionName) {
            console.log("[RecurringSync] Showing single transaction toast:", result.transactionName);
            toast({
              title: t("single", { name: result.transactionName }),
              variant: "default",
              duration: 5000,
            });
          } else {
            console.log("[RecurringSync] Showing multiple transactions toast:", result.generated);
            toast({
              title: t("multiple", { count: result.generated }),
              variant: "default",
              duration: 5000,
            });
          }
        } else if (result.generated > 0) {
          console.log("[RecurringSync] Transactions generated but toast skipped (push notification sent)");
        }

        if (result.errors.length > 0) {
          console.error("[RecurringSync] Errors occurred:", result.errors);
          toast({
            title: tCommon("errorLabel"),
            description: result.errors[0],
            variant: "destructive",
            duration: 7000,
          });
        }
      } catch (err) {
        console.error("[RecurringSync] Fatal error:", err);
        if (mounted) {
          toast({
            title: tCommon("errorLabel"),
            description: err instanceof Error ? err.message : tCommon("unexpectedError"),
            variant: "destructive",
            duration: 7000,
          });
        }
      }
    };

    // Run once on mount
    syncRecurringTransactions();

    return () => {
      mounted = false;
    };
  }, [session, toast, t, tCommon]);

  return null; // Silent background component
}
