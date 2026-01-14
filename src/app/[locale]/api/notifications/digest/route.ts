import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getWeekRange, getLastWeekRange } from "@/lib/ai/stats";
import { selectModel } from "@/lib/ai/routing";
import { buildCountersPrompt } from "@/lib/ai/promptBuilders";
import { streamOpenAIText } from "@/lib/llm/openai";
import { streamGeminiText } from "@/lib/llm/google";
import { computeNextAllowedTime } from "@/lib/quietHours";
import type { Language } from "@/types/locale";

type DigestLanguage = Language;

type DigestStrings = {
  weeklyTitle: string;
  lastWeekLabel: string;
  expensesLabel: string;
  incomeLabel: string;
  topLabel: string;
  expensesDifferenceText: (percent: string) => string;
  incomeDifferenceText: (percent: string) => string;
  aiSystem: string;
};

const DIGEST_STRINGS: Record<DigestLanguage, DigestStrings> = {
  en: {
    weeklyTitle: "Weekly Digest",
    lastWeekLabel: "Last week",
    expensesLabel: "Expenses",
    incomeLabel: "Income",
    topLabel: "Top",
    expensesDifferenceText: (percent) =>
      `Expenses changed by ${percent}% compared to the previous week.`,
    incomeDifferenceText: (percent) =>
      `Income changed by ${percent}% compared to the previous week.`,
    aiSystem:
      "You are a helpful budgeting assistant. Reply in 2–3 concise sentences.",
  },
  uk: {
    weeklyTitle: "Щотижневий звіт",
    lastWeekLabel: "Минулий тиждень",
    expensesLabel: "Витрати",
    incomeLabel: "Дохід",
    topLabel: "Топ",
    expensesDifferenceText: (percent) =>
      `Витрати змінилися на ${percent}% порівняно з попереднім тижнем.`,
    incomeDifferenceText: (percent) =>
      `Дохід змінився на ${percent}% порівняно з попереднім тижнем.`,
    aiSystem:
      "You are a helpful budgeting assistant. Reply in 2–3 concise sentences.",
  },
  ru: {
    weeklyTitle: "Еженедельный отчёт",
    lastWeekLabel: "Прошлая неделя",
    expensesLabel: "Расходы",
    incomeLabel: "Доходы",
    topLabel: "Топ",
    expensesDifferenceText: (percent) =>
      `Расходы изменились на ${percent}% по сравнению с прошлой неделей.`,
    incomeDifferenceText: (percent) =>
      `Доходы изменились на ${percent}% по сравнению с прошлой неделей.`,
    aiSystem:
      "You are a helpful budgeting assistant. Reply in 2–3 concise sentences.",
  },
  hi: {
    weeklyTitle: "साप्ताहिक सारांश",
    lastWeekLabel: "पिछला सप्ताह",
    expensesLabel: "खर्च",
    incomeLabel: "आय",
    topLabel: "टॉप",
    expensesDifferenceText: (percent) =>
      `पिछले सप्ताह की तुलना में खर्च ${percent}% बदल गया।`,
    incomeDifferenceText: (percent) =>
      `पिछले सप्ताह की तुलना में आय ${percent}% बदल गई।`,
    aiSystem:
      "You are a helpful budgeting assistant. Reply in 2–3 concise sentences.",
  },
  id: {
    weeklyTitle: "Ringkasan Mingguan",
    lastWeekLabel: "Minggu lalu",
    expensesLabel: "Pengeluaran",
    incomeLabel: "Pemasukan",
    topLabel: "Teratas",
    expensesDifferenceText: (percent) =>
      `Pengeluaran berubah ${percent}% dibanding minggu sebelumnya.`,
    incomeDifferenceText: (percent) =>
      `Pemasukan berubah ${percent}% dibanding minggu sebelumnya.`,
    aiSystem:
      "You are a helpful budgeting assistant. Reply in 2–3 concise sentences.",
  },
  ja: {
    weeklyTitle: "週間サマリー",
    lastWeekLabel: "先週",
    expensesLabel: "支出",
    incomeLabel: "収入",
    topLabel: "トップ",
    expensesDifferenceText: (percent) =>
      `支出は前週比で${percent}%変化しました。`,
    incomeDifferenceText: (percent) =>
      `収入は前週比で${percent}%変化しました。`,
    aiSystem:
      "You are a helpful budgeting assistant. Reply in 2–3 concise sentences.",
  },
  ko: {
    weeklyTitle: "주간 요약",
    lastWeekLabel: "지난주",
    expensesLabel: "지출",
    incomeLabel: "수입",
    topLabel: "상위",
    expensesDifferenceText: (percent) =>
      `지출은 전주 대비 ${percent}% 변동했습니다.`,
    incomeDifferenceText: (percent) =>
      `수입은 전주 대비 ${percent}% 변동했습니다.`,
    aiSystem:
      "You are a helpful budgeting assistant. Reply in 2–3 concise sentences.",
  },
};

function toIntlLocale(lang: DigestLanguage): string {
  switch (lang) {
    case "ru":
      return "ru-RU";
    case "uk":
      return "uk-UA";
    case "hi":
      return "hi-IN";
    case "id":
      return "id-ID";
    case "ja":
      return "ja-JP";
    case "ko":
      return "ko-KR";
    case "en":
    default:
      return "en-US";
  }
}

async function getUserPreferredLanguage(
  supabase: any,
  userId: string,
): Promise<DigestLanguage> {
  const normalize = (l: unknown): DigestLanguage => {
    if (typeof l !== "string") return DEFAULT_LOCALE;
    if (!isSupportedLanguage(l)) return DEFAULT_LOCALE;
    return l;
  };

  try {
    const { data, error } = await supabase
      .from("user_settings")
      .select("locale")
      .eq("user_id", userId)
      .maybeSingle();

    if (!error && data?.locale) {
      return normalize(data.locale);
    }

    const code = (error as any)?.code;
    const msg = String((error as any)?.message || "");
    const relationMissing = code === "42P01" || msg.includes("does not exist");
    if (error && !relationMissing) {
      console.warn("digest: user_settings locale read failed", error);
    }
  } catch {
    // ignore
  }

  try {
    const { data, error } = await supabase
      .from("users")
      .select("locale")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.locale) {
      return normalize(data.locale);
    }
  } catch {
    // ignore
  }

  return DEFAULT_LOCALE;
}

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get("authorization") || "";
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  const okByBearer = bearer.startsWith("Bearer ")
    ? bearer.slice(7) === (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    : false;
  // ВСЕГДА boolean: есть CRON_SECRET и заголовок совпадает
  const okBySecret =
    !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

  return okByBearer || okBySecret;
}

function formatCurrency(n: number, locale: string, currency: string) {
  try {
    return new Intl.NumberFormat(locale || "en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `$${Math.round(n || 0)}`;
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const currency = "USD"; // Можно расширить и брать из профиля

  // Точки недели: текущая неделя (старт в понедельник) и прошлые периоды
  const { start: thisWeekStart } = getWeekRange(new Date());
  const { start: lastWeekStart, end: lastWeekEnd } =
    getLastWeekRange(thisWeekStart);
  const { start: prevWeekStart, end: prevWeekEnd } =
    getLastWeekRange(lastWeekStart);

  // 1) Выбираем активных пользователей по preferences
  const { data: prefs, error: prefsErr } = await supabase
    .from("notification_preferences")
    .select(
      "user_id, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone",
    )
    .neq("engagement_frequency", "disabled");

  if (prefsErr) {
    console.error("digest: preferences error", prefsErr);
    return NextResponse.json(
      {
        error: "Failed to fetch preferences",
      },
      { status: 500 },
    );
  }

  const targets = (prefs || []).filter(
    (p) => p.push_enabled || p.email_enabled,
  );
  let created = 0;
  let skipped = 0;

  for (const p of targets) {
    const userId = p.user_id;

    const lang = await getUserPreferredLanguage(supabase, userId);
    const strings = DIGEST_STRINGS[lang];
    const intlLocale = toIntlLocale(lang);

    // Идемпотентность: проверяем, не создавали ли дайджест за эту прошлую неделю
    const idemKey = `weekly:${userId}:${lastWeekStart.toISOString().slice(0, 10)}`;
    const { data: existing } = await supabase
      .from("notification_queue")
      .select("id")
      .eq("user_id", userId)
      .eq("notification_type", "weekly_reminder")
      .gte("created_at", lastWeekStart.toISOString())
      .lte("created_at", lastWeekEnd.toISOString())
      .limit(1);

    if (existing && existing.length > 0) {
      skipped++;
      continue;
    }

    // Берём транзакции за прошлую и позапрошлую недели
    const { data: lastWeekTxs, error: lastErr } = await supabase
      .from("transactions")
      .select(`
        id, title, amount, type, created_at, budget_folder_id,
        budget_folders ( name, emoji )
      `)
      .eq("user_id", userId)
      .gte("created_at", lastWeekStart.toISOString())
      .lte("created_at", lastWeekEnd.toISOString());

    if (lastErr) {
      console.warn("digest: lastWeek tx error", lastErr);
      skipped++;
      continue;
    }

    const { data: prevWeekTxs, error: prevErr } = await supabase
      .from("transactions")
      .select("id, title, amount, type, created_at, budget_folder_id")
      .eq("user_id", userId)
      .gte("created_at", prevWeekStart.toISOString())
      .lte("created_at", prevWeekEnd.toISOString());

    if (prevErr) {
      console.warn("digest: prevWeek tx error", prevErr);
    }

    const totalExpensesLast = (lastWeekTxs || [])
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const totalIncomeLast = (lastWeekTxs || [])
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + (t.amount || 0), 0);

    const totalExpensesPrev = (prevWeekTxs || [])
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const totalIncomePrev = (prevWeekTxs || [])
      .filter((t) => t.type === "income")
      .reduce((s, t) => s + (t.amount || 0), 0);

    // Топ‑категории (по расходам)
    const byBudget = new Map<string, number>();
    for (const t of lastWeekTxs || []) {
      if (t.type !== "expense") continue;
      const name =
        (Array.isArray(t.budget_folders)
          ? t.budget_folders[0]?.name
          : (t as any)?.budget_folders?.name) || "Unassigned";
      byBudget.set(name, (byBudget.get(name) || 0) + (t.amount || 0));
    }
    const topBudgets = Array.from(byBudget.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    // Получаем план пользователя (free/pro)
    const { data: userRow } = await supabase
      .from("users")
      .select("is_pro")
      .eq("id", userId)
      .maybeSingle();
    const isPro = (userRow as any)?.is_pro === true;

    // Сводка по прошлой неделе (базовая, для Free и Pro)
    const title = strings.weeklyTitle;
    const topBudgetsText = topBudgets.length
      ? `${strings.topLabel}: ${topBudgets
          .map(([n, v]) => `${n} ${formatCurrency(v, intlLocale, currency)}`)
          .join(", ")}.`
      : "";
    const bodyBasic =
      `${strings.lastWeekLabel} — ` +
      `${strings.expensesLabel} ${formatCurrency(totalExpensesLast, intlLocale, currency)}, ` +
      `${strings.incomeLabel} ${formatCurrency(totalIncomeLast, intlLocale, currency)}. ` +
      topBudgetsText;

    let body = bodyBasic;

    // Для Pro — добавляем краткие AI-инсайты, если есть ключи API
    if (isPro) {
      // Получаем основной бюджет (по желанию, для процента использования)
      const { data: mainBudgetRow } = await supabase
        .from("main_budget")
        .select("amount")
        .eq("user_id", userId)
        .maybeSingle();
      const budget = Number(mainBudgetRow?.amount ?? 0);

      // Метрики для buildCountersPrompt (на недельной выборке)
      const expensesTrendPercent =
        totalExpensesPrev > 0
          ? ((totalExpensesLast - totalExpensesPrev) / totalExpensesPrev) * 100
          : totalExpensesLast > 0
            ? 100
            : 0;
      const incomeTrendPercent =
        totalIncomePrev > 0
          ? ((totalIncomeLast - totalIncomePrev) / totalIncomePrev) * 100
          : totalIncomeLast > 0
            ? 100
            : 0;
      const incomeCoveragePercent =
        totalIncomeLast > 0 ? (totalExpensesLast / totalIncomeLast) * 100 : 0;
      const budgetUsagePercentage =
        budget > 0 ? (totalExpensesLast / budget) * 100 : 0;
      const remainingBudget = Math.max(0, budget - totalExpensesLast);
      const budgetStatus =
        budget <= 0
          ? "not-set"
          : budgetUsagePercentage > 100
            ? "exceeded"
            : budgetUsagePercentage > 80
              ? "warning"
              : "good";

      const expensesDifferenceText = strings.expensesDifferenceText(
        Math.abs(expensesTrendPercent).toFixed(1),
      );

      const incomeDifferenceText = strings.incomeDifferenceText(
        Math.abs(incomeTrendPercent).toFixed(1),
      );

      const prompt = buildCountersPrompt({
        budget,
        totalExpenses: totalExpensesLast,
        totalIncome: totalIncomeLast,
        previousMonthExpenses: totalExpensesPrev, // используем прежнюю неделю как ориентир
        previousMonthIncome: totalIncomePrev,
        budgetUsagePercentage,
        remainingBudget,
        budgetStatus: budgetStatus as any,
        expensesTrendPercent,
        incomeTrendPercent,
        incomeCoveragePercent,
        expensesDifferenceText,
        incomeDifferenceText,
        currency,
        locale: lang,
      });

      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasGemini = !!process.env.GOOGLE_API_KEY;
      const model = selectModel(true, true); // Pro + сложный (аналитика)
      const requestId = `digest_${userId}_${Date.now()}`;
      let aiText = "";

      try {
        if (model.includes("gpt") && hasOpenAI) {
          const stream = streamOpenAIText({
            model: process.env.OPENAI_MODEL ?? "gpt-4-turbo",
            prompt,
            system: strings.aiSystem,
            requestId,
          });
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            aiText += typeof value === "string" ? value : decoder.decode(value);
            if (aiText.length > 700) break;
          }
        } else if (hasGemini) {
          const stream = streamGeminiText({
            model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
            prompt,
            system: strings.aiSystem,
            requestId,
          });
          const reader = stream.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            aiText += typeof value === "string" ? value : decoder.decode(value);
            if (aiText.length > 700) break;
          }
        }
      } catch {
        // safe fallback: оставляем базовый текст
      }

      if (aiText.trim().length > 0) {
        body = `${bodyBasic} ${aiText.trim()}`;
      }
    }

    const actionUrl = "/dashboard?view=report&period=lastWeek";
    const deepLink = actionUrl;

    // In‑app уведомление
    const { error: notifErr } = await supabase.from("notifications").insert({
      user_id: userId,
      title,
      message: body,
      type: "weekly_reminder",
      metadata: {
        week_start: lastWeekStart.toISOString().slice(0, 10),
        transactions_count: (lastWeekTxs || []).length,
        total_spent: totalExpensesLast,
        currency,
        deepLink,
      },
      is_read: false,
    });
    if (notifErr) {
      console.warn("digest: notif insert error", notifErr);
    }

    const scheduledAt = computeNextAllowedTime(new Date(), p).toISOString();

    // Задача в очередь + игнор дублей
    const { error: queueErr } = await supabase
      .from("notification_queue")
      .insert({
        user_id: userId,
        notification_type: "weekly_reminder",
        title,
        message: body,
        data: {
          deepLink,
          tag: "weekly_reminder",
          renotify: true,
          idempotent_key: idemKey,
        },
        action_url: actionUrl,
        send_push: !!p.push_enabled,
        send_email: !!p.email_enabled,
        scheduled_for: scheduledAt,
        status: "pending",
        attempts: 0,
        max_attempts: 3,
      });

    if (queueErr) {
      if (String((queueErr as any).code) === "23505") {
        // Конфликт уникальности — игнорируем
        skipped++;
        continue;
      }
      console.warn("digest: queue insert error", queueErr);
      skipped++;
      continue;
    }

    const hasAIInsight = isPro && body !== bodyBasic;

    const { error: telemetryErr } = await supabase
      .from("telemetry_events")
      .insert({
        user_id: userId,
        event_name: "digest_generated",
        payload: {
          type: "weekly_reminder",
          is_pro: isPro,
          has_ai_insight: hasAIInsight,
        },
      });

    if (telemetryErr) {
      console.warn("digest: telemetry insert error", telemetryErr);
    }

    created++;
  }

  return NextResponse.json({
    ok: true,
    created,
    skipped,
    period: { lastWeekStart, lastWeekEnd },
  });
}
