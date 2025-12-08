"use server";

// Imports
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { prepareUserContext } from "@/lib/ai/context";
import { parseAddCommand, sanitizeTitle } from "@/lib/ai/commands";
import { isComplexRequest, selectModel } from "@/lib/ai/routing";
import {
  detectIntentFromMessage,
  detectPeriodFromMessage,
} from "@/lib/ai/intent";
import {
  getWeekRange,
  getLastWeekRange,
  filterByDateRange,
  sumExpenses,
  budgetTotals as calcBudgetTotals,
  topExpenses,
  getThisMonthRange,
  compareMonthTotals,
} from "@/lib/ai/stats";
import type { AIAction, AIResponse, AIRequest, Transaction } from "@/types/ai";
import {
  buildInstructions,
  buildWeeklySections,
  buildMonthlySections,
  buildPrompt,
} from "@/prompts/spendlyPal/promptBuilder";
import { PROMPT_VERSION } from "@/prompts/spendlyPal/promptVersion";
import { localizeEmptyWeekly } from "@/prompts/spendlyPal/canonicalPhrases";

// Исполнение транзакции (вставка expense)
export const executeTransaction = async (
  userId: string,
  payload: { title: string; amount: number; budget_folder_id: string | null },
) => {
  const supabase = getServerSupabaseClient();

  const title = sanitizeTitle(payload.title);
  const amount = Number(payload.amount);
  if (!isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Amount must be greater than zero." };
  }
  if (!payload.budget_folder_id) {
    return {
      ok: false,
      message:
        "Selected budget was not found. Please choose an existing budget.",
    };
  }

  // Определяем тип транзакции по папке бюджета
  const { data: folder, error: folderErr } = await supabase
    .from("budget_folders")
    .select("id, type")
    .eq("id", payload.budget_folder_id)
    .limit(1)
    .single();

  if (folderErr || !folder) {
    return {
      ok: false,
      message: "Budget folder not found. Please refresh and try again.",
    };
  }

  const txType: "expense" | "income" =
    folder.type === "income" ? "income" : "expense";

  const { error } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      title,
      amount,
      type: txType,
      budget_folder_id: payload.budget_folder_id,
      created_at: new Date().toISOString(),
    })
    .select();

  if (error) {
    return {
      ok: false,
      message: "Failed to add transaction. Please try again.",
    };
  }
  return { ok: true, message: "Transaction added successfully!" };
};

// CRUD для recurring_rules
export const listRecurringRules = async (userId: string) => {
  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("recurring_rules")
    .select(
      "id, user_id, title_pattern, budget_folder_id, avg_amount, cadence, next_due_date, active, created_at, updated_at",
    )
    .eq("user_id", userId)
    .order("avg_amount", { ascending: false });

  if (error) return [] as any[];
  return data || [];
};

export const upsertRecurringRule = async (
  userId: string,
  candidate: {
    title_pattern: string;
    budget_folder_id: string | null;
    avg_amount: number;
    cadence: "weekly" | "monthly";
    next_due_date: string;
  },
) => {
  const supabase = getServerSupabaseClient();

  // Enforce Free-tier rule limit (max 2)
  try {
    const { data: userRes } = await supabase.auth.admin.getUserById(userId);
    const isPro =
      (userRes?.user?.user_metadata as any)?.subscription_status === "pro";

    if (!isPro) {
      const { count, error: countErr } = await supabase
        .from("recurring_rules")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if (!countErr && (count ?? 0) >= 2) {
        return {
          ok: false,
          message: "limitReached",
        };
      }
    }
  } catch {
    // if user lookup fails, we default to allow, but prefer not to block
  }

  const payload = {
    user_id: userId,
    title_pattern: candidate.title_pattern,
    budget_folder_id: candidate.budget_folder_id,
    avg_amount: Number(candidate.avg_amount),
    cadence: candidate.cadence,
    next_due_date: candidate.next_due_date,
    active: true,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("recurring_rules")
    .upsert(payload, { onConflict: "user_id,title_pattern" })
    .select();
  if (error) {
    return { ok: false, message: "Failed to save recurring rule." };
  }
  return { ok: true, message: "Recurring rule saved.", id: data?.[0]?.id };
};

// Обёртка промпта для LLM (тон, секции и т.д.)
export const composeLLMPrompt = (
  ctx: {
    budgets: Array<{
      id: string;
      name: string;
      emoji?: string;
      type: "expense" | "income";
      amount?: number;
    }>;
    lastTransactions: Array<{
      title: string;
      amount: number;
      type: "expense" | "income";
      budget_folder_id: string | null;
      created_at: string;
    }>;
    lastMonthTxs: any[];
  },
  userMessage: string,
  opts?: {
    locale?: string;
    currency?: string;
    promptVersion?: string;
    maxChars?: number;
    tone?: "neutral" | "friendly" | "formal" | "playful";
  },
): string => {
  // Thin wrapper: detect intent, compute aggregates via stats.ts, delegate formatting to promptBuilder
  const locale = opts?.locale || "en-US";
  const currency = (opts?.currency || "USD").toUpperCase();
  const intent = detectIntentFromMessage(userMessage);
  const builderIntent =
    intent === "save_advice" ||
    intent === "analyze_spending" ||
    intent === "biggest_expenses" ||
    intent === "compare_months"
      ? intent
      : "unknown";

  const budgetNameById = new Map<string, string>();
  for (const b of ctx.budgets || []) {
    if (b.id) budgetNameById.set(b.id, b.name);
  }

  const now = new Date();
  const { start: weekStart } = getWeekRange(now);
  const { start: lastWeekStart, end: lastWeekEnd } =
    getLastWeekRange(weekStart);

  const txsThisWeek = filterByDateRange(
    (ctx.lastTransactions || []) as Transaction[],
    weekStart,
    now,
  );
  const txsLastWeek = filterByDateRange(
    (ctx.lastTransactions || []) as Transaction[],
    lastWeekStart,
    lastWeekEnd,
  );

  const thisWeekExpensesTotal = sumExpenses(txsThisWeek);
  const lastWeekExpensesTotal = sumExpenses(txsLastWeek);

  const budgetTotalsThisWeek = calcBudgetTotals(txsThisWeek, budgetNameById);
  const budgetTotalsLastWeek = calcBudgetTotals(txsLastWeek, budgetNameById);

  const top3ThisWeek = topExpenses(txsThisWeek, 3);
  const top3LastWeek = topExpenses(txsLastWeek, 3);

  const { start: thisMonthStart, end: thisMonthEnd } = getThisMonthRange(now);
  const txsThisMonth = filterByDateRange(
    (ctx.lastTransactions || []) as Transaction[],
    thisMonthStart,
    thisMonthEnd,
  );
  const lastMonthTxs = (ctx.lastMonthTxs || []) as any[] as Transaction[];

  const {
    totalThis: totalThisMonth,
    totalLast: totalLastMonth,
    diff,
  } = compareMonthTotals(txsThisMonth, lastMonthTxs);

  const budgetTotalsThisMonth = calcBudgetTotals(txsThisMonth, budgetNameById);
  const budgetTotalsLastMonth = calcBudgetTotals(lastMonthTxs, budgetNameById);

  const top3ThisMonth = topExpenses(txsThisMonth, 3);
  const top3LastMonth = topExpenses(lastMonthTxs, 3);

  const instructions = buildInstructions({
    locale,
    currency,
    promptVersion: opts?.promptVersion || PROMPT_VERSION,
    intent: builderIntent,
    tone: opts?.tone,
  });

  const weeklySection = buildWeeklySections({
    weekStartISO: weekStart.toISOString().slice(0, 10),
    weekEndISO: now.toISOString().slice(0, 10),
    lastWeekStartISO: lastWeekStart.toISOString().slice(0, 10),
    lastWeekEndISO: lastWeekEnd.toISOString().slice(0, 10),
    thisWeekTotal: thisWeekExpensesTotal,
    lastWeekTotal: lastWeekExpensesTotal,
    budgetTotalsThisWeek,
    budgetTotalsLastWeek,
    txsThisWeek,
    txsLastWeek,
    topThisWeek: top3ThisWeek,
    topLastWeek: top3LastWeek,
    currency,
    budgetNameById,
  });

  const monthlySection = buildMonthlySections({
    thisMonthStartISO: thisMonthStart.toISOString().slice(0, 10),
    thisMonthEndISO: thisMonthEnd.toISOString().slice(0, 10),
    lastMonthStartISO: new Date(
      thisMonthStart.getFullYear(),
      thisMonthStart.getMonth() - 1,
      1,
    )
      .toISOString()
      .slice(0, 10),
    lastMonthEndISO: new Date(
      thisMonthStart.getFullYear(),
      thisMonthStart.getMonth(),
      0,
    )
      .toISOString()
      .slice(0, 10),
    totalThisMonth,
    totalLastMonth,
    diff,
    budgetTotalsThisMonth,
    budgetTotalsLastMonth,
    topThisMonth: top3ThisMonth,
    topLastMonth: top3LastMonth,
    currency,
    budgetNameById,
  });

  return buildPrompt({
    budgets: ctx.budgets,
    instructions,
    weeklySection,
    monthlySection,
    userMessage,
    maxChars: opts?.maxChars,
  });
};

// Канонический ответ без вызова LLM, если за период нет расходов
export const getCanonicalEmptyReply = (
  ctx: {
    budgets: Array<{
      id: string;
      name: string;
      emoji?: string;
      type: "expense" | "income";
      amount?: number;
    }>;
    lastTransactions: Array<{
      title: string;
      amount: number;
      type: "expense" | "income";
      budget_folder_id: string | null;
      created_at: string;
    }>;
    lastMonthTxs: any[];
  },
  userMessage: string,
  opts?: { locale?: string },
): {
  shouldBypass: boolean;
  message: string;
  period: "thisWeek" | "lastWeek" | "unknown";
} => {
  const rawPeriod = detectPeriodFromMessage(userMessage);
  const period: "thisWeek" | "lastWeek" | "unknown" =
    rawPeriod === "thisWeek" || rawPeriod === "lastWeek"
      ? rawPeriod
      : "unknown";
  if (period === "unknown") return { shouldBypass: false, message: "", period };

  const now = new Date();
  const { start: weekStart } = getWeekRange(now);
  const { start: lastWeekStart, end: lastWeekEnd } =
    getLastWeekRange(weekStart);

  const txsThisWeek = filterByDateRange(
    (ctx.lastTransactions || []) as Transaction[],
    weekStart,
    now,
  );
  const txsLastWeek = filterByDateRange(
    (ctx.lastTransactions || []) as Transaction[],
    lastWeekStart,
    lastWeekEnd,
  );

  const thisWeekExpensesTotal = sumExpenses(txsThisWeek);
  const lastWeekExpensesTotal = sumExpenses(txsLastWeek);

  const debug =
    process.env.LLM_DEBUG === "1" || process.env.LLM_DEBUG === "true";
  if (period === "thisWeek" && thisWeekExpensesTotal <= 0) {
    if (debug) {
      console.debug(
        "[LLM_DEBUG canonical]",
        JSON.stringify({
          period,
          total: thisWeekExpensesTotal,
          reason: "no-expenses",
        }),
      );
    }
    return {
      shouldBypass: true,
      message: localizeEmptyWeekly("thisWeek", opts?.locale),
      period,
    };
  }
  if (period === "lastWeek" && lastWeekExpensesTotal <= 0) {
    if (debug) {
      console.debug(
        "[LLM_DEBUG canonical]",
        JSON.stringify({
          period,
          total: lastWeekExpensesTotal,
          reason: "no-expenses",
        }),
      );
    }
    return {
      shouldBypass: true,
      message: localizeEmptyWeekly("lastWeek", opts?.locale),
      period,
    };
  }
  return { shouldBypass: false, message: "", period };
};

// Парсер подтверждения “сохрани как повторяющуюся”
function parseSaveRecurringCommand(
  message: string,
  candidates?: Array<{
    title_pattern: string;
    budget_folder_id: string | null;
    avg_amount: number;
    cadence: "weekly" | "monthly";
    next_due_date: string;
    count: number;
  }>,
): AIAction | null {
  const text = (message || "").toLowerCase();
  const trigger = [
    "сохрани как повтор",
    "сохранить как повтор",
    "сохранить подписк",
    "да, сохрани как повтор",
    "save as recurring",
    "save recurring",
    "save subscription",
  ];
  if (!trigger.some((h) => text.includes(h))) return null;
  if (!candidates || candidates.length === 0) return null;

  // Пытаемся сопоставить по содержимому сообщения
  const matched = candidates.find(
    (c) => c.title_pattern && text.includes(c.title_pattern.toLowerCase()),
  );
  const picked = matched || candidates[0];
  return {
    type: "save_recurring_rule",
    payload: {
      title_pattern: picked.title_pattern,
      budget_folder_id: picked.budget_folder_id,
      avg_amount: picked.avg_amount,
      cadence: picked.cadence,
      next_due_date: picked.next_due_date,
    },
  };
}

// Основной обработчик запроса ИИ (без стрима — стрим делаем в API)
export const aiResponse = async (req: AIRequest): Promise<AIResponse> => {
  const {
    userId,
    isPro = false,
    enableLimits = false,
    message,
    confirm = false,
    actionPayload,
    locale } = req;
  // Локализация (server-side)
  const { DEFAULT_LOCALE, isSupportedLanguage, loadMessages } = await import("@/i18n/config");
  const lang = isSupportedLanguage(locale ?? "") ? (locale as any) : DEFAULT_LOCALE;
  const messages = await loadMessages(lang);
  const a = messages?.assistant ?? {};
  const errTexts = a?.errors ?? {};
  const tParseFailed =
    errTexts?.parseFailed ||
    'Unable to create a transaction. Check the input and make sure the budget exists. Use: Add "Title" 12.34 to <Budget> budget.';
  const tBudgetNotFound = (name: string) =>
    (errTexts?.budgetNotFound || 'Budget "{name}" was not found. Please check the name or create it.').replace("{name}", name);

  // Небольшая эвристика: сообщение похоже на добавление?
  const looksLikeAddAttempt = (msg: string) => {
    const m = (msg || "").trim().toLowerCase();
    const addCandidates = ["add", "ad", "добав", "дод", "tambah", "tambahkan", "追加", "추가", "जोड़"];
    const hasBudgetToken = /\b(budget|бюджет)\b/i.test(msg);
    const hasNumberOrCurrency = /(?:\d+[.,]?\d*)|[$€£₽₹₴]/.test(msg);
    return addCandidates.some((a) => m.startsWith(a)) || (hasBudgetToken && hasNumberOrCurrency);
  };

  const ctx = await prepareUserContext(userId);

  const parsed = parseAddCommand(message, ctx.budgets as any);
  if (parsed && !confirm) {
    if (!parsed.budget_folder_id) {
      return {
        kind: "message",
        message: tBudgetNotFound(parsed.budget_name),
        model: "gemini-2.5-flash",
      };
    }
    const action: AIAction = { type: "add_transaction", payload: parsed };
    const confirmText = `Confirm adding $${parsed.amount.toFixed(2)} "${parsed.title}" to ${parsed.budget_name}? Reply Yes/No.`;
    return { kind: "action", action, confirmText };
  }

  // Если похоже на попытку добавления, но парсер не понял — дружелюбная подсказка без LLM
  if (!parsed && looksLikeAddAttempt(message)) {
    return { kind: "message", message: tParseFailed, model: "gemini-2.5-flash" };
  }

  // Подтверждение сохранения подписки
  const saveRecurring = parseSaveRecurringCommand(
    message,
    ctx.recurringCandidates,
  );
  if (
    saveRecurring &&
    saveRecurring.type === "save_recurring_rule" &&
    !confirm
  ) {
    const cp = saveRecurring.payload;
    const confirmText = `Confirm saving recurring rule "${cp.title_pattern}" (${cp.cadence}, ~$${cp.avg_amount.toFixed(2)}, next: ${cp.next_due_date})? Reply Yes/No.`;
    return { kind: "action", action: saveRecurring, confirmText };
  }

  if (confirm && actionPayload) {
    const res = await executeTransaction(userId, actionPayload as any);
    const suffix = res.ok ? "We updated your charts." : "Please try again.";
    return {
      kind: "message",
      message: `${res.message} ${suffix}`,
      model: "gemini-2.5-flash",
    };
  }

  const complex = isComplexRequest(message);
  const model = selectModel(isPro, complex);

  const summary = `Model: ${model}. Last 30 transactions loaded. Last month transactions: ${ctx.lastMonthTxs.length}. Ask me to add items using "add ... to ... budget".`;

  return { kind: "message", message: summary, model };
};