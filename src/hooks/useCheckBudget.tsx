// Хук: useCheckBudget
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { supabase } from "../lib/supabaseClient";

const useCheckBudget = (userId: string | undefined) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkBudget = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("Checking main budget for user:", userId);

        const { data, error } = await supabase
          .from("main_budget")
          .select("user_id")
          .eq("user_id", userId)
          .maybeSingle();

        console.log("Main budget response:", { data, error });

        if (error) {
          console.error("Error checking main budget:", error);
          return;
        }

        if (!data) {
          console.log(
            "No main budget found - user should complete onboarding first",
          );
          // Don't redirect - budget is now created during onboarding
        }
      } catch (error) {
        console.error("Error checking main budget:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkBudget();
  }, [userId, router]);

  return { isLoading };
};

export default useCheckBudget;
