/**
 * Process recurring transactions at 9am local time
 * Handles month-end edge cases (day 31 on 30-day months)
 */

import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { computeNextAllowedTime } from "@/lib/quietHours";
import type { AssistantTone } from "@/types/ai";
import type { Language } from "@/types/locale";

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
): Promise<string | null> {
  try {
    const supabase = getServerSupabaseClient();

    const sinceIso = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", recurring.user_id)
      .eq("is_recurring", false)
      .eq("title", recurring.title)
      .eq("amount", recurring.amount)
      .eq("type", recurring.type)
      .gte("created_at", sinceIso)
      .limit(1);

    if (existing && existing.length > 0) {
      return null;
    }

    const { data, error } = await supabase.from("transactions").insert({
      user_id: recurring.user_id,
      title: recurring.title,
      amount: recurring.amount,
      type: recurring.type,
      budget_folder_id: recurring.budget_folder_id,
      created_at: new Date().toISOString(),
      is_recurring: false, // The created transaction is not recurring itself
    })
    .select("id")
    .single();

    if (error) {
      console.error("Error creating transaction from recurring:", error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error("Error creating transaction from recurring:", error);
    return null;
  }
}

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
    send_push: !!prefs?.push_enabled,
    send_email: !!prefs?.email_enabled,
    attempts: 0,
    scheduled_for: scheduledFor,
    data: {
      source: "recurring_transaction",
      tag: params.tag,
      deepLink: params.deepLink,
    },
  });
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
    const supabase = getServerSupabaseClient();

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
      const resolvedLocale = normalizeLanguage(locale);

      let tone: AssistantTone = "neutral";
      try {
        const { data } = await supabase.auth.admin.getUserById(user_id);
        const raw = (data?.user?.user_metadata as unknown) as
          | { assistant_tone?: unknown }
          | undefined;
        const t = raw?.assistant_tone;
        if (
          t === "neutral" ||
          t === "friendly" ||
          t === "formal" ||
          t === "playful"
        ) {
          tone = t;
        }
      } catch {
        // ignore
      }

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

        const createdId = await createTransactionFromRecurring(tx);

        if (createdId) {
          processed++;

          // Get user's currency preference
          const { data: settings } = await supabase
            .from("user_settings")
            .select("currency")
            .eq("user_id", user_id)
            .maybeSingle();

          const currency = settings?.currency || "USD";

          await enqueueRecurringCreatedNotification({
            userId: user_id,
            locale: resolvedLocale,
            tone,
            title: tx.title,
            amount: tx.amount,
            currency,
            deepLink: "/transactions",
            tag: `recurring:${user_id}:${createdId}`,
          });
        } else {
          // Most likely duplicate protection (already created recently)
          console.log(
            `Skipping recurring transaction (duplicate safeguard): user=${user_id}, title=${tx.title}`,
          );
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
