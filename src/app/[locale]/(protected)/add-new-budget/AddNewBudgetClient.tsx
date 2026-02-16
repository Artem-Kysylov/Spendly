"use client";
import { useTranslations } from "next-intl";
import { useState } from "react";
import CreateMainBudget from "@/components/budgets/CreateMainBudget";
import ToastMessage from "@/components/ui-elements/ToastMessage";
import { UserAuth } from "@/context/AuthContext";
import { useRouter } from "@/i18n/routing";
import { supabase } from "@/lib/supabaseClient";
import { isValidAmountInput, parseAmountInput } from "@/lib/utils";
import type { UserLocaleSettings } from "@/types/locale";
import type { ToastMessageProps } from "@/types/types";

export default function AddNewBudgetClient() {
  const { session } = UserAuth();
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<ToastMessageProps | null>(
    null,
  );
  const tBudgets = useTranslations("budgets");

  const handleToastMessage = (
    text: string,
    type: ToastMessageProps["type"],
  ) => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateBudget = async (
    budget: string,
    locale?: UserLocaleSettings,
  ) => {
    try {
      if (!session?.user?.id) throw new Error("User not authenticated");

      if (!isValidAmountInput(budget)) {
        handleToastMessage(tBudgets("list.toast.failedCreate"), "error");
        return;
      }

      const parsedBudget = parseAmountInput(budget);

      if (locale) {
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
          body: JSON.stringify({
            country: locale.country,
            currency: locale.currency,
            locale: locale.locale,
          }),
        });
        if (!resp.ok) {
          const err = await resp.json();
          console.error("Error saving user locale settings:", err);
          throw new Error(err.error || "Failed to save locale settings");
        }
      }

      const { error } = await supabase
        .from("main_budget")
        .upsert([{ user_id: session.user.id, amount: parsedBudget }], {
          onConflict: "user_id",
        })
        .select();

      if (error) throw error;

      handleToastMessage(tBudgets("list.toast.createSuccess"), "success");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (error: unknown) {
      console.error("Error creating budget:", error);
      handleToastMessage(tBudgets("list.toast.failedCreate"), "error");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      {toastMessage && (
        <ToastMessage text={toastMessage.text} type={toastMessage.type} />
      )}
      <CreateMainBudget onSubmit={handleCreateBudget} />
    </div>
  );
}
