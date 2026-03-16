// Интент и детекция периода из пользовательского сообщения

import type { Intent, Period } from "@/types/ai";

export const detectIntentFromMessage = (userMessage: string): Intent => {
  const text = (userMessage || "").toLowerCase();

  const presets: Array<{ intent: Intent; patterns: string[] }> = [
    {
      intent: "show_week_expenses",
      patterns: [
        "show my expenses for this week",
        "this week expenses",
        "weekly expenses",
        "за эту неделю",
        "расходы за неделю",
        "неделя",
        "покажи траты за неделю",
      ],
    },
    {
      intent: "show_month_expenses",
      patterns: [
        "show my expenses for this month",
        "this month expenses",
        "monthly expenses",
        "за этот месяц",
        "расходы за месяц",
        "месяц",
        "покажи траты за месяц",
      ],
    },
    {
      intent: "save_advice",
      patterns: [
        "where can i save money",
        "save money",
        "economy advice",
        "saving tips",
        "как сэкономить",
        "советы по экономии",
        "где могу сэкономить",
      ],
    },
    {
      intent: "analyze_spending",
      patterns: [
        "analyze my spending patterns",
        "spending patterns",
        "analyze spending",
        "рассмотри мои траты",
        "проанализируй расходы",
        "анализ расходов",
      ],
    },
    {
      intent: "create_budget_plan",
      patterns: [
        "create a budget plan",
        "budget plan",
        "план бюджета",
        "создай план бюджета",
      ],
    },
    {
      intent: "biggest_expenses",
      patterns: [
        "show my biggest expenses",
        "biggest expenses",
        "top expenses",
        "largest expenses",
        "крупные траты",
        "самые большие расходы",
        "топ расходов",
      ],
    },
    {
      intent: "compare_months",
      patterns: [
        "compare this month vs last month",
        "this month vs last month",
        "compare months",
        "сравни этот месяц с прошлым",
        "сравнение месяцев",
        "этот месяц против прошлого",
      ],
    },
    {
      intent: "show_recurring_charges",
      patterns: [
        // RU
        "подписк",
        "повтор",
        "ежемесячно",
        "еженедельно",
        // EN
        "recurring",
        "subscription",
        "monthly",
        "weekly",
      ],
    },
  ];

  for (const p of presets) {
    if (p.patterns.some((h) => text.includes(h))) {
      return p.intent;
    }
  }
  return "unknown";
};

export const isBudgetLimitIntent = (userMessage: string): boolean => {
  const text = (userMessage || "").toLowerCase();
  if (!text.trim()) return false;

  const hasDigit = /\d/.test(text);
  const amountHints: string[] = [
    "thousand",
    "million",
    "тысяч",
    "тысяча",
    "тыс",
    "миллион",
    "млн",
    "тисяч",
    "тисяча",
    "тис",
    "ribu",
    "juta",
    "千",
    "万",
    "천",
    "만",
    "हज़ार",
    "हजार",
    "लाख",
  ];
  const hasAmountHint = amountHints.some((h) => h && text.includes(h));
  if (!hasDigit && !hasAmountHint) return false;

  const patterns: string[] = [
    // EN
    "budget",
    "limit",
    "set limit",
    // RU
    "бюджет",
    "лимит",
    "установи лимит",
    // UK
    "бюджет",
    "ліміт",
    "встанови ліміт",
    // HI
    "बजट",
    "सीमा",
    // ID
    "anggaran",
    "batas",
    // JA
    "予算",
    "限度額",
    // KO
    "예산",
    "한도",
  ];

  return patterns.some((p) => p && text.includes(p));
};

export const detectPeriodFromMessage = (userMessage: string): Period => {
  const text = (userMessage || "").toLowerCase();
  // EN hints
  const lastWeekHintsEN = ["last week", "previous week", "past week"];
  const thisWeekHintsEN = ["this week", "current week", "thisweek"];
  const lastMonthHintsEN = ["last month", "previous month", "past month"];
  const thisMonthHintsEN = ["this month", "current month", "thismonth"];
  // RU hints
  const lastWeekHintsRU = [
    "прошлая неделя",
    "предыдущая неделя",
    "за прошлую неделю",
    "за пред неделю",
  ];
  const thisWeekHintsRU = [
    "эта неделя",
    "текущая неделя",
    "за эту неделю",
    "за текущую неделю",
    "неделя",
  ];
  const lastMonthHintsRU = [
    "прошлый месяц",
    "предыдущий месяц",
    "за прошлый месяц",
  ];
  const thisMonthHintsRU = [
    "этот месяц",
    "текущий месяц",
    "за этот месяц",
    "за текущий месяц",
    "месяц",
  ];

  if (
    lastWeekHintsEN.some((h) => text.includes(h)) ||
    lastWeekHintsRU.some((h) => text.includes(h))
  )
    return "lastWeek";

  // упрощенно: если есть "неделя" и нет "прошла/предыдущая", трактуем как текущую
  const isThisWeekEN =
    thisWeekHintsEN.some((h) => text.includes(h)) && !text.includes("last");
  const isThisWeekRU =
    thisWeekHintsRU.some((h) => text.includes(h)) &&
    !(text.includes("прошл") || text.includes("пред"));
  if (isThisWeekEN || isThisWeekRU) return "thisWeek";

  if (
    lastMonthHintsEN.some((h) => text.includes(h)) ||
    lastMonthHintsRU.some((h) => text.includes(h))
  )
    return "lastMonth";
  const isThisMonthEN =
    thisMonthHintsEN.some((h) => text.includes(h)) && !text.includes("last");
  const isThisMonthRU =
    thisMonthHintsRU.some((h) => text.includes(h)) &&
    !(text.includes("прошл") || text.includes("пред"));
  if (isThisMonthEN || isThisMonthRU) return "thisMonth";

  return "unknown";
};
