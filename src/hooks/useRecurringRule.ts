import { useCallback, useEffect, useState } from "react";
import { UserAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import type { RecurringRule } from "@/types/ai";

interface RecurringRuleLookupInput {
  title: string;
  amount: number;
  type: "expense" | "income";
  budgetFolderId?: string | null;
}

interface UpdateRecurringRuleInput {
  title_pattern?: string;
  budget_folder_id?: string | null;
  avg_amount?: number;
  cadence?: "weekly" | "monthly";
  next_due_date?: string;
  type?: "expense" | "income";
}

export function useRecurringRule(
  recurringRuleId?: string | null,
  fallbackLookup?: RecurringRuleLookupInput,
) {
  const { session } = UserAuth();
  const [recurringRule, setRecurringRule] = useState<RecurringRule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolvedRecurringRuleId = recurringRuleId ?? recurringRule?.id ?? null;

  const fetchRecurringRule = useCallback(async () => {
    if (!session?.user?.id || (!recurringRuleId && !fallbackLookup)) {
      setRecurringRule(null);
      setError(null);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("recurring_rules")
        .select(
          "id, user_id, title_pattern, budget_folder_id, avg_amount, cadence, next_due_date, active, created_at, updated_at, type",
        )
        .eq("user_id", session.user.id);

      if (recurringRuleId) {
        query = query.eq("id", recurringRuleId);
      } else if (fallbackLookup) {
        query = query
          .eq("title_pattern", fallbackLookup.title)
          .eq("avg_amount", fallbackLookup.amount)
          .eq("type", fallbackLookup.type);

        if (fallbackLookup.budgetFolderId) {
          query = query.eq("budget_folder_id", fallbackLookup.budgetFolderId);
        } else {
          query = query.is("budget_folder_id", null);
        }
      }

      const { data, error: fetchError } = await query.maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      const nextRule = (data as RecurringRule | null) ?? null;
      setRecurringRule(nextRule);
      return nextRule;
    } catch (fetchError) {
      console.error("Error fetching recurring rule:", fetchError);
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error");
      setRecurringRule(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [
    fallbackLookup?.amount,
    fallbackLookup?.budgetFolderId,
    fallbackLookup?.title,
    fallbackLookup?.type,
    recurringRuleId,
    session?.user?.id,
  ]);

  const updateRecurringRule = useCallback(
    async (patch: UpdateRecurringRuleInput) => {
      if (!session?.user?.id || !resolvedRecurringRuleId) {
        throw new Error("Missing recurring rule context");
      }

      const { data, error: updateError } = await supabase
        .from("recurring_rules")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("id", resolvedRecurringRuleId)
        .eq("user_id", session.user.id)
        .select(
          "id, user_id, title_pattern, budget_folder_id, avg_amount, cadence, next_due_date, active, created_at, updated_at, type",
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      const updatedRule = data as RecurringRule;
      setRecurringRule(updatedRule);
      return updatedRule;
    },
    [resolvedRecurringRuleId, session?.user?.id],
  );

  useEffect(() => {
    void fetchRecurringRule();
  }, [fetchRecurringRule]);

  return {
    recurringRule,
    isLoading,
    error,
    refetchRecurringRule: fetchRecurringRule,
    updateRecurringRule,
  };
}
