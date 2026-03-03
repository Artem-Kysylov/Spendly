/**
 * Process recurring transactions at 9am local time
 * Handles month-end edge cases (day 31 on 30-day months)
 */

import { supabase } from "./supabaseClient";

interface RecurringTransaction {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  type: "expense" | "income";
  budget_folder_id: string | null;
  recurrence_day: number;
  is_recurring: boolean;
}

interface UserSettings {
  user_id: string;
  timezone: string | null;
  locale?: string;
}

/**
 * Get the last day of the current month
 */
function getLastDayOfMonth(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.getDate();
}

/**
 * Check if it's time to process a recurring transaction
 * Handles month-end edge cases
 */
function shouldProcessToday(recurrenceDay: number): boolean {
  const today = new Date().getDate();
  const lastDayOfMonth = getLastDayOfMonth();

  // If recurrence day is greater than days in current month,
  // process on the last day of the month
  if (recurrenceDay > lastDayOfMonth) {
    return today === lastDayOfMonth;
  }

  return today === recurrenceDay;
}

/**
 * Check if it's 9am in the user's timezone
 */
function is9amInTimezone(timezone: string): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    });

    const hour = parseInt(formatter.format(now), 10);
    return hour === 9;
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`, error);
    return false;
  }
}

/**
 * Create a new transaction from a recurring template
 */
async function createTransactionFromRecurring(
  recurring: RecurringTransaction,
): Promise<boolean> {
  try {
    const { error } = await supabase.from("transactions").insert({
      user_id: recurring.user_id,
      title: recurring.title,
      amount: recurring.amount,
      type: recurring.type,
      budget_folder_id: recurring.budget_folder_id,
      created_at: new Date().toISOString(),
      is_recurring: false, // The created transaction is not recurring itself
    });

    if (error) {
      console.error("Error creating transaction from recurring:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error creating transaction from recurring:", error);
    return false;
  }
}

/**
 * Send push notification for recurring transaction
 */
async function sendPushNotification(
  userId: string,
  title: string,
  amount: number,
  currency: string,
  locale: string,
): Promise<void> {
  // TODO: Implement push notification logic
  // This will be implemented when push notification infrastructure is ready
  console.log(
    `[Push Notification] User ${userId}: ${title} for ${amount} ${currency} (locale: ${locale})`,
  );
}

/**
 * Process all recurring transactions for users at 9am local time
 */
export async function processRecurringTransactions(): Promise<{
  processed: number;
  failed: number;
}> {
  let processed = 0;
  let failed = 0;

  try {
    // Get all users with timezone settings
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_settings")
      .select("user_id, timezone, locale")
      .not("timezone", "is", null);

    if (settingsError) {
      console.error("Error fetching user settings:", settingsError);
      return { processed, failed };
    }

    const settings = (userSettings as UserSettings[]) || [];

    // Filter users who are at 9am in their timezone
    const usersAt9am = settings.filter((s) =>
      s.timezone ? is9amInTimezone(s.timezone) : false,
    );

    if (usersAt9am.length === 0) {
      console.log("No users at 9am local time");
      return { processed, failed };
    }

    console.log(`Processing ${usersAt9am.length} users at 9am local time`);

    // Process each user
    for (const userSetting of usersAt9am) {
      const { user_id, locale } = userSetting;

      // Get user's recurring transactions
      const { data: recurringTxs, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user_id)
        .eq("is_recurring", true);

      if (txError) {
        console.error(`Error fetching recurring transactions for user ${user_id}:`, txError);
        failed++;
        continue;
      }

      const transactions = (recurringTxs as RecurringTransaction[]) || [];

      // Process each recurring transaction
      for (const tx of transactions) {
        if (!shouldProcessToday(tx.recurrence_day)) {
          continue;
        }

        const success = await createTransactionFromRecurring(tx);

        if (success) {
          processed++;

          // Get user's currency preference
          const { data: settings } = await supabase
            .from("user_settings")
            .select("currency")
            .eq("user_id", user_id)
            .single();

          const currency = settings?.currency || "USD";

          // Send push notification
          await sendPushNotification(
            user_id,
            tx.title,
            tx.amount,
            currency,
            locale || "en",
          );
        } else {
          failed++;
        }
      }
    }

    console.log(`Processed ${processed} recurring transactions, ${failed} failed`);
    return { processed, failed };
  } catch (error) {
    console.error("Error processing recurring transactions:", error);
    return { processed, failed };
  }
}
