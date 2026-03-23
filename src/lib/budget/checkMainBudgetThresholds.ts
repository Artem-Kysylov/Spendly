import { SupabaseClient } from "@supabase/supabase-js";

import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getFinancialMonthToDateRange } from "@/lib/dateUtils";
import {
  getNotificationMessage,
  type NotificationVariant,
} from "@/lib/notificationStrings";
import type { Language } from "@/types/locale";

interface ThresholdConfig {
  threshold: "80" | "90" | "100" | "exceeded";
  variant: NotificationVariant;
  queueType: "budget_warning" | "budget_overrun";
}

const MAIN_BUDGET_LABELS: Record<Language, string> = {
  en: "main budget",
  ru: "основной бюджет",
  uk: "головний бюджет",
  hi: "मुख्य बजट",
  id: "anggaran utama",
  ja: "メイン予算",
  ko: "메인 예산",
};

const MAIN_BUDGET_TITLES: Record<Language, Record<ThresholdConfig["threshold"], string>> = {
  en: {
    "80": "Main budget at 80%",
    "90": "Main budget at 90%",
    "100": "Main budget limit reached",
    exceeded: "Main budget exceeded",
  },
  ru: {
    "80": "Основной бюджет достиг 80%",
    "90": "Основной бюджет достиг 90%",
    "100": "Лимит основного бюджета достигнут",
    exceeded: "Основной бюджет превышен",
  },
  uk: {
    "80": "Головний бюджет досяг 80%",
    "90": "Головний бюджет досяг 90%",
    "100": "Ліміт головного бюджету досягнуто",
    exceeded: "Головний бюджет перевищено",
  },
  hi: {
    "80": "मुख्य बजट 80% पर है",
    "90": "मुख्य बजट 90% पर है",
    "100": "मुख्य बजट की सीमा पूरी हो गई",
    exceeded: "मुख्य बजट पार हो गया",
  },
  id: {
    "80": "Anggaran utama mencapai 80%",
    "90": "Anggaran utama mencapai 90%",
    "100": "Batas anggaran utama tercapai",
    exceeded: "Anggaran utama terlampaui",
  },
  ja: {
    "80": "メイン予算が80%に達しました",
    "90": "メイン予算が90%に達しました",
    "100": "メイン予算の上限に達しました",
    exceeded: "メイン予算を超過しました",
  },
  ko: {
    "80": "메인 예산이 80%에 도달했어요",
    "90": "메인 예산이 90%에 도달했어요",
    "100": "메인 예산 한도에 도달했어요",
    exceeded: "메인 예산을 초과했어요",
  },
};

function normalizeLanguage(input: unknown, fallback: Language): Language {
  if (typeof input !== "string") return fallback;
  const trimmed = input.trim().toLowerCase();
  const base = trimmed.split(/[-_]/)[0] || "";
  if (!isSupportedLanguage(base)) return fallback;
  return base as Language;
}

function resolveThresholdConfig(percentage: number): ThresholdConfig | null {
  if (percentage > 100) {
    return {
      threshold: "exceeded",
      variant: "over_budget",
      queueType: "budget_overrun",
    };
  }

  if (percentage >= 100) {
    return {
      threshold: "100",
      variant: "limit_reached",
      queueType: "budget_warning",
    };
  }

  if (percentage >= 90) {
    return {
      threshold: "90",
      variant: "warning_90",
      queueType: "budget_warning",
    };
  }

  if (percentage >= 80) {
    return {
      threshold: "80",
      variant: "warning_80",
      queueType: "budget_warning",
    };
  }

  return null;
}

export async function checkMainBudgetThresholds(
  supabase: SupabaseClient,
  userId: string,
  locale: Language,
) {
  try {
    const fallbackLocale = locale || DEFAULT_LOCALE;

    const [{ data: userSettings }, { data: mainBudget }, { data: profile }, { data: state }] =
      await Promise.all([
        supabase
          .from("user_settings")
          .select("locale, currency")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("main_budget")
          .select("amount")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("budget_reset_day")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("main_budget_state")
          .select("carryover, income_confirmed")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

    const resolvedLocale = normalizeLanguage(userSettings?.locale, fallbackLocale);
    const resetDayRaw = profile?.budget_reset_day;
    const resetDay =
      typeof resetDayRaw === "number" && Number.isFinite(resetDayRaw)
        ? Math.min(31, Math.max(1, Math.floor(resetDayRaw)))
        : 1;

    const baseBudget = Number(mainBudget?.amount ?? 0);
    const carryover = Number(state?.carryover ?? 0);
    const incomeConfirmed = state?.income_confirmed ?? true;
    const effectiveBudget = incomeConfirmed ? baseBudget + carryover : carryover;

    if (!Number.isFinite(effectiveBudget) || effectiveBudget <= 0) {
      return;
    }

    const { start, end } = getFinancialMonthToDateRange(resetDay);
    const { data: expenses, error: expensesError } = await supabase
      .from("transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("type", "expense")
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString());

    if (expensesError) return;

    const totalSpent = (expenses || []).reduce(
      (sum, tx) => sum + Number((tx as { amount?: number | null }).amount ?? 0),
      0,
    );
    const percentage = (totalSpent / effectiveBudget) * 100;
    const config = resolveThresholdConfig(percentage);

    if (!config) return;

    const cycleKey = start.toISOString().slice(0, 10);
    const dedupeMetadata = {
      budget_scope: "main_budget",
      threshold: config.threshold,
      cycle_start: cycleKey,
    };

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", userId)
      .in("type", ["budget_warning", "budget_overrun"])
      .contains("metadata", dedupeMetadata)
      .limit(1);

    if (existing && existing.length > 0) return;

    const { data: existingQueued } = await supabase
      .from("notification_queue")
      .select("id")
      .eq("user_id", userId)
      .eq("notification_type", config.queueType)
      .contains("data", dedupeMetadata)
      .limit(1);

    if (existingQueued && existingQueued.length > 0) return;

    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("push_enabled, email_enabled")
      .eq("user_id", userId)
      .maybeSingle();

    const budgetLabel = MAIN_BUDGET_LABELS[resolvedLocale] ?? MAIN_BUDGET_LABELS.en;
    const title =
      MAIN_BUDGET_TITLES[resolvedLocale]?.[config.threshold] ??
      MAIN_BUDGET_TITLES.en[config.threshold];
    const message = getNotificationMessage(
      "budget_alert",
      resolvedLocale,
      { category: budgetLabel },
      config.variant,
    );

    await supabase.from("notification_queue").insert({
      user_id: userId,
      notification_type: config.queueType,
      title,
      message,
      status: "pending",
      send_push: !!prefs?.push_enabled,
      send_email: !!prefs?.email_enabled,
      attempts: 0,
      scheduled_for: new Date().toISOString(),
      data: {
        ...dedupeMetadata,
        deepLink: "/dashboard",
        spent_amount: totalSpent,
        total_budget: effectiveBudget,
      },
    });
  } catch (error) {
    console.error("Error checking main budget thresholds:", error);
  }
}
