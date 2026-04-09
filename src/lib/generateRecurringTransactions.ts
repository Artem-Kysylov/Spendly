/**
 * Generate transactions from recurring_rules table
 * Unified system for automatic recurring transaction creation
 */

import { getTranslations } from "next-intl/server";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { checkMainBudgetThresholds } from "@/lib/budget/checkMainBudgetThresholds";
import { checkBudgetThresholds } from "@/lib/budget/checkThresholds";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { computeNextAllowedTime } from "@/lib/quietHours";
import { toOffsetISOString } from "@/lib/dateUtils";
import type { AssistantTone } from "@/types/ai";
import type { Language } from "@/types/locale";

interface RecurringRule {
  id: string;
  user_id: string;
  title_pattern: string;
  avg_amount: number;
  type: "expense" | "income";
  budget_folder_id: string | null;
  cadence: "weekly" | "monthly";
  next_due_date: string;
  last_generated_date: string | null;
  active: boolean;
}

interface UserSettings {
  user_id: string;
  timezone: string | null;
  locale?: string;
  currency?: string;
}

interface GenerationResult {
  generated: number;
  skipped: number;
  errors: string[];
  pushQueued: number;
  transactions: Array<{
    id: string;
    title: string;
    amount: number;
    userId: string;
  }>;
}

function normalizeLanguage(input: unknown): Language {
  if (typeof input !== "string") return DEFAULT_LOCALE;
  const trimmed = input.trim().toLowerCase();
  const base = trimmed.split(/[-_]/)[0] || "";
  if (!isSupportedLanguage(base)) return DEFAULT_LOCALE;
  return base as Language;
}

function toIntlLocale(locale: Language): string {
  const map: Record<Language, string> = {
    en: "en-US",
    ru: "ru-RU",
    uk: "uk-UA",
    hi: "hi-IN",
    id: "id-ID",
    ja: "ja-JP",
    ko: "ko-KR",
  };
  return map[locale] ?? "en-US";
}

function formatCurrencyForPush(amount: number, currency: string, locale: Language): string {
  try {
    return new Intl.NumberFormat(toIntlLocale(locale), {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * Calculate next occurrence date based on cadence
 */
function calculateNextOccurrence(currentDueDate: string, cadence: "weekly" | "monthly"): string {
  const date = new Date(currentDueDate);
  
  if (cadence === "weekly") {
    date.setDate(date.getDate() + 7);
  } else {
    // Monthly - handle month-end edge cases
    const currentDay = date.getDate();
    date.setMonth(date.getMonth() + 1);
    
    // If the day doesn't exist in the new month (e.g., Jan 31 -> Feb 31)
    // JavaScript automatically adjusts, but we want the last day of the month
    const newMonthLastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    if (currentDay > newMonthLastDay) {
      date.setDate(newMonthLastDay);
    } else {
      date.setDate(currentDay);
    }
  }
  
  return date.toISOString().split('T')[0];
}

/**
 * Create a new transaction from a recurring rule
 */
async function createTransactionFromRule(
  rule: RecurringRule,
): Promise<string | null> {
  try {
    const supabase = getServerSupabaseClient();

    // Duplicate protection: check for same title/amount in last 2 hours
    const sinceIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", rule.user_id)
      .eq("title", rule.title_pattern)
      .eq("amount", rule.avg_amount)
      .eq("type", rule.type)
      .gte("created_at", sinceIso)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`Duplicate protection: skipping ${rule.title_pattern}`);
      return null;
    }

    // Create the transaction
    const { data, error } = await supabase.from("transactions").insert({
      user_id: rule.user_id,
      title: rule.title_pattern,
      amount: rule.avg_amount,
      type: rule.type,
      budget_folder_id: rule.budget_folder_id,
      created_at: toOffsetISOString(new Date()),
      is_recurring: false, // The created transaction is not recurring itself
      recurring_rule_id: rule.id,
    })
    .select("id")
    .single();

    if (error) {
      console.error("Error creating transaction from rule:", error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("Error creating transaction from rule:", error);
    return null;
  }
}

/**
 * Enqueue push notification for recurring transaction creation
 */
async function enqueueRecurringCreatedNotification(params: {
  userId: string;
  locale: Language;
  tone: AssistantTone;
  title: string;
  amount: number;
  currency: string;
  deepLink: string;
  tag: string;
}) {
  const supabase = getServerSupabaseClient();
  const now = new Date();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select(
      "push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone",
    )
    .eq("user_id", params.userId)
    .maybeSingle();

  // Only enqueue if push is enabled
  if (!prefs?.push_enabled) {
    return false;
  }

  const tRecurring = await getTranslations({
    locale: params.locale,
    namespace: "recurring",
  });

  const amountText = formatCurrencyForPush(
    params.amount,
    params.currency,
    params.locale,
  );

  const title = tRecurring("push.createdTitle", { name: params.title });

  const bodyKey =
    params.tone === "formal"
      ? "push.createdBodyFormal"
      : params.tone === "playful"
        ? "push.createdBodyPlayful"
        : params.tone === "friendly"
          ? "push.createdBodyFriendly"
          : "push.createdBodyNeutral";

  const message = tRecurring(bodyKey, {
    name: params.title,
    amount: amountText,
  });

  const scheduledFor = computeNextAllowedTime(now, prefs ?? undefined).toISOString();

  await supabase.from("notification_queue").insert({
    user_id: params.userId,
    notification_type: "general",
    title,
    message,
    status: "pending",
    send_push: true,
    send_email: !!prefs?.email_enabled,
    attempts: 0,
    scheduled_for: scheduledFor,
    data: {
      source: "recurring_transaction",
      tag: params.tag,
      deepLink: params.deepLink,
    },
  });

  return true;
}

/**
 * Generate transactions from all active recurring rules that are due
 * This is the main function called by both cron and client-side triggers
 */
export async function generateRecurringTransactions(
  userId?: string
): Promise<GenerationResult> {
  const result: GenerationResult = {
    generated: 0,
    skipped: 0,
    errors: [],
    pushQueued: 0,
    transactions: [],
  };

  try {
    const supabase = getServerSupabaseClient();
    const today = new Date().toISOString().split('T')[0];

    // Build query for recurring rules that are due
    let query = supabase
      .from("recurring_rules")
      .select("*")
      .eq("active", true)
      .lte("next_due_date", today);

    // If userId provided, filter to that user only
    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: rules, error: rulesError } = await query;

    if (rulesError) {
      console.error("Error fetching recurring rules:", rulesError);
      result.errors.push("Failed to fetch recurring rules");
      return result;
    }

    const recurringRules = (rules as RecurringRule[]) || [];

    if (recurringRules.length === 0) {
      console.log("No recurring rules due for generation");
      return result;
    }

    console.log(`Processing ${recurringRules.length} recurring rules`);

    // Process each rule
    for (const rule of recurringRules) {
      try {
        // Get user settings for locale, currency, and assistant tone
        const { data: settings } = await supabase
          .from("user_settings")
          .select("locale, currency")
          .eq("user_id", rule.user_id)
          .maybeSingle();

        const resolvedLocale = normalizeLanguage(settings?.locale);
        const currency = settings?.currency || "USD";

        // Use default neutral tone for recurring transaction notifications
        // Note: admin.getUserById requires service role key which may not be available in client-side server actions
        const tone: AssistantTone = "neutral";

        // Create the transaction
        const createdId = await createTransactionFromRule(rule);

        if (createdId) {
          result.generated++;
          result.transactions.push({
            id: createdId,
            title: rule.title_pattern,
            amount: rule.avg_amount,
            userId: rule.user_id,
          });

          // Update the recurring rule
          const nextDueDate = calculateNextOccurrence(rule.next_due_date, rule.cadence);
          await supabase
            .from("recurring_rules")
            .update({
              last_generated_date: new Date().toISOString(),
              next_due_date: nextDueDate,
              updated_at: new Date().toISOString(),
            })
            .eq("id", rule.id);

          // Trigger budget threshold checks for expenses
          if (rule.type === "expense" && rule.budget_folder_id) {
            try {
              await checkBudgetThresholds(
                supabase,
                rule.user_id,
                rule.budget_folder_id,
                resolvedLocale,
              );
            } catch (thresholdError) {
              console.error(
                `Error checking budget threshold for rule ${rule.id}:`,
                thresholdError,
              );
            }
          }

          if (rule.type === "expense") {
            try {
              await checkMainBudgetThresholds(supabase, rule.user_id, resolvedLocale);
            } catch (mainThresholdError) {
              console.error(
                `Error checking main budget threshold for rule ${rule.id}:`,
                mainThresholdError,
              );
            }
          }

          // Enqueue push notification (if enabled)
          const pushQueued = await enqueueRecurringCreatedNotification({
            userId: rule.user_id,
            locale: resolvedLocale,
            tone,
            title: rule.title_pattern,
            amount: rule.avg_amount,
            currency,
            deepLink: "/transactions",
            tag: `recurring:${rule.user_id}:${createdId}`,
          });

          if (pushQueued) {
            result.pushQueued++;
          }
        } else {
          result.skipped++;
          console.log(
            `Skipped recurring rule (duplicate safeguard): ${rule.title_pattern}`,
          );
        }
      } catch (ruleError) {
        result.errors.push(
          `Error processing rule ${rule.title_pattern}: ${ruleError instanceof Error ? ruleError.message : "Unknown error"}`
        );
        console.error(`Error processing rule ${rule.id}:`, ruleError);
      }
    }

    console.log(
      `Generated ${result.generated} transactions, skipped ${result.skipped}, queued ${result.pushQueued} push notifications`
    );
    return result;
  } catch (error) {
    console.error("Error in generateRecurringTransactions:", error);
    result.errors.push(
      error instanceof Error ? error.message : "Unknown error"
    );
    return result;
  }
}
