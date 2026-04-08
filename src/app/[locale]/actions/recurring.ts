/**
 * Server actions for recurring transaction management
 */

"use server";

import { generateRecurringTransactions } from "@/lib/generateRecurringTransactions";
import { getServerSupabaseClient } from "@/lib/serverSupabase";

interface ProcessResult {
  generated: number;
  skipped: number;
  errors: string[];
  shouldShowToast: boolean;
  transactionName?: string;
}

/**
 * Process recurring transactions for the current authenticated user
 * Called on app boot via RecurringSync component
 */
export async function processUserRecurringTransactions(
  userId: string,
): Promise<ProcessResult> {
  try {
    const supabase = getServerSupabaseClient();

    if (!userId) {
      return {
        generated: 0,
        skipped: 0,
        errors: ["Missing user id"],
        shouldShowToast: false,
      };
    }

    // Check if push notifications are enabled for this user
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    const pushEnabled = prefs?.push_enabled ?? false;

    // Generate transactions for this user only
    const result = await generateRecurringTransactions(userId);

    // Determine if we should show toast
    // Show toast if: transactions were generated AND (push is disabled OR push failed)
    const shouldShowToast = result.generated > 0 && (!pushEnabled || result.pushQueued === 0);

    // Get the first transaction name for single transaction toast
    const transactionName = result.transactions.length === 1 
      ? result.transactions[0].title 
      : undefined;

    return {
      generated: result.generated,
      skipped: result.skipped,
      errors: result.errors,
      shouldShowToast,
      transactionName,
    };
  } catch (error) {
    console.error("Error in processUserRecurringTransactions:", error);
    return {
      generated: 0,
      skipped: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
      shouldShowToast: false,
    };
  }
}
