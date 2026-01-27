"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { supabase } from "@/lib/supabaseClient";
import { UserAuth } from "@/context/AuthContext";
import CreateMainBudget from "@/components/budgets/CreateMainBudget";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { useTranslations } from "next-intl";
import { saveUserLocaleSettings } from "@/app/[locale]/actions/saveUserLocaleSettings";
import type { UserLocaleSettings } from "@/types/locale";

export default function BudgetSetupClient() {
  const { session, isReady } = UserAuth();
  const router = useRouter();
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);
  const tSetupBudget = useTranslations("setup.budget");
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (isReady && !session) {
      router.replace("/");
    }
  }, [isReady, session, router]);

  const onSubmit = async (budget: string, settings?: UserLocaleSettings) => {
    if (!session?.user?.id) {
      setToast({ text: tSetupBudget("toast.signInRequired"), type: "error" });
      return;
    }

    try {
      const amount = Number(budget);
      if (!amount || amount <= 0) {
        setToast({ text: tSetupBudget("toast.invalidAmount"), type: "error" });
        return;
      }

      // Persist user locale settings (country, currency, locale)
      try {
        if (settings) {
          const res = await saveUserLocaleSettings({
            userId: session.user.id,
            country: settings.country,
            currency: settings.currency,
            locale: settings.locale,
          });

          if (!res.success) {
            console.warn("Failed to save locale settings:", {
              userId: session.user.id,
              stage: res.stage,
              code: res.code,
              message: res.message,
            });
          }

          if (typeof window !== "undefined" && settings.currency) {
            localStorage.setItem("user-currency", settings.currency);
          }

          if (settings.currency) {
            try {
              await supabase.auth.updateUser({
                data: { currency_preference: settings.currency },
              });
            } catch {}
          }
        }
      } catch (e) {
        // If locale save fails (e.g., missing users table), continue with budget save
        console.warn("Failed to save locale settings:", e);
      }

      const { error } = await supabase
        .from("main_budget")
        .upsert({ user_id: session.user.id, amount }, { onConflict: "user_id" })
        .select();

      if (error) {
        setToast({ text: tSetupBudget("toast.saveFailed"), type: "error" });
        return;
      }

      setToast({ text: tSetupBudget("toast.saveSuccess"), type: "success" });
      router.push("/dashboard");
    } catch (error) {
      console.error("Error saving budget:", error);
      setToast({ text: tCommon("unexpectedError"), type: "error" });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {toast && <ToastMessage text={toast.text} type={toast.type} />}
      <CreateMainBudget onSubmit={onSubmit} />
    </div>
  );
}
