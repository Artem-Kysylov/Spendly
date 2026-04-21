import type { SupabaseClient } from "@supabase/supabase-js";

interface CyclicBudgetRow {
  id: string;
  amount: number;
}

interface BudgetStateRow {
  last_renewal_date: string | null;
  cycle_start_date: string | null;
}

interface ResetResult {
  resetCount: number;
  insightsCreated: number;
}

/**
 * Resets all cyclic ("auto-reset") budget folders for the given user.
 *
 * For each budget where `is_cyclic = true`:
 *   - Computes leftover since the current `last_renewal_date`.
 *   - Persists leftover to `budget_folders.rollover_carry` (0 when overspent).
 *   - Creates a `savings_success` insight when leftover > 0.
 *
 * Finally, advances `main_budget_state.last_renewal_date` so the `BudgetsClient`
 * "spent" calculation effectively treats the folder as zeroed-out.
 *
 * Safe to call from both the renewal modal and the income-confirmation popup.
 */
export async function resetCyclicBudgetFolders(
  supabase: SupabaseClient,
  userId: string,
): Promise<ResetResult> {
  const { data: stateData } = await supabase
    .from("main_budget_state")
    .select("last_renewal_date, cycle_start_date")
    .eq("user_id", userId)
    .maybeSingle();

  const state = stateData as BudgetStateRow | null;
  const currentLastRenewalDate = state?.last_renewal_date;
  const currentCycleDate = state?.cycle_start_date;

  const { data: cyclicBudgets, error: cyclicError } = await supabase
    .from("budget_folders")
    .select("id, amount")
    .eq("user_id", userId)
    .eq("type", "expense")
    .eq("is_cyclic", true);

  if (cyclicError) {
    console.error("resetCyclicBudgetFolders: fetch failed", cyclicError);
    return { resetCount: 0, insightsCreated: 0 };
  }

  const budgets = (cyclicBudgets ?? []) as CyclicBudgetRow[];
  if (budgets.length === 0) {
    await supabase
      .from("main_budget_state")
      .update({
        last_renewal_date: new Date().toISOString(),
        snooze_until: null,
      })
      .eq("user_id", userId);
    return { resetCount: 0, insightsCreated: 0 };
  }

  const insights: Array<{
    user_id: string;
    budget_folder_id: string;
    insight_type: string;
    cycle_date: string;
    amount_saved: number;
    dismissed: boolean;
  }> = [];

  for (const budget of budgets) {
    let spent = 0;

    if (currentLastRenewalDate) {
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", userId)
        .eq("budget_folder_id", budget.id)
        .eq("type", "expense")
        .gte("created_at", currentLastRenewalDate);

      spent = (transactions ?? []).reduce(
        (sum, t) => sum + Number(t.amount ?? 0),
        0,
      );
    }

    const leftover = Number(budget.amount) - spent;
    const carry = leftover > 0 ? leftover : 0;

    if (leftover > 0) {
      insights.push({
        user_id: userId,
        budget_folder_id: budget.id,
        insight_type: "savings_success",
        cycle_date:
          currentCycleDate ?? new Date().toISOString().split("T")[0],
        amount_saved: leftover,
        dismissed: false,
      });
    }

    const { error: updateErr } = await supabase
      .from("budget_folders")
      .update({ rollover_carry: carry })
      .eq("id", budget.id)
      .eq("user_id", userId);

    if (updateErr) {
      console.error(
        `resetCyclicBudgetFolders: failed updating ${budget.id}`,
        updateErr,
      );
    }
  }

  if (insights.length > 0) {
    const { error: insightErr } = await supabase
      .from("budget_insights")
      .insert(insights);
    if (insightErr) {
      console.error("resetCyclicBudgetFolders: insights insert failed", insightErr);
    }
  }

  const { error: stateErr } = await supabase
    .from("main_budget_state")
    .update({
      last_renewal_date: new Date().toISOString(),
      snooze_until: null,
    })
    .eq("user_id", userId);

  if (stateErr) {
    console.error("resetCyclicBudgetFolders: state update failed", stateErr);
  }

  return {
    resetCount: budgets.length,
    insightsCreated: insights.length,
  };
}
