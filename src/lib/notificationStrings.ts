import type { Language } from "@/types/locale";

export type NotificationCategory = 
  | "daily_reminder" 
  | "budget_alert" 
  | "aggressive" 
  | "retention";

export type NotificationVariant = 
  | "standard" 
  | "action_oriented" 
  | "casual" 
  | "short" 
  | "professional"
  | "warning_80"
  | "limit_reached"
  | "over_budget"
  | "saving_goal"
  | "urgent"
  | "direct"
  | "provocative"
  | "persistence"
  | "friendly"
  | "insight_based"
  | "goal_focused";

type LocalizedString = string | ((params: Record<string, string | number>) => string);

interface NotificationTemplate {
  en: LocalizedString;
  ru: LocalizedString;
  [key: string]: LocalizedString; // Support for other languages
}

export const NOTIFICATION_STRINGS: Record<NotificationCategory, Record<string, NotificationTemplate>> = {
  daily_reminder: {
    standard: {
      en: "Time for a quick check-in! Did you spend anything today?",
      ru: "Время быстрой проверки! Были ли траты сегодня?"
    },
    action_oriented: {
      en: "Keep your streak alive! Log your expenses for today.",
      ru: "Поддержи серию! Запиши свои расходы за сегодня."
    },
    casual: {
      en: "Evening update: How's your wallet feeling? Add your transactions now.",
      ru: "Вечерний апдейт: Как там твой кошелек? Добавь транзакции сейчас."
    },
    short: {
      en: "Don't forget to track your spending! 💰",
      ru: "Не забудь записать расходы! 💰"
    },
    professional: {
      en: "Stay on top of your finances. Record your daily activity in Spendly.",
      ru: "Держи финансы под контролем. Запиши дневную активность в Spendly."
    }
  },
  budget_alert: {
    warning_80: {
      en: (p) => `Heads up! You’ve used 80% of your ${p.category} budget.`,
      ru: (p) => `Внимание! Вы использовали 80% бюджета категории ${p.category}.`
    },
    limit_reached: {
      en: (p) => `Budget Alert: You've reached your limit for ${p.category}. Time to slow down?`,
      ru: (p) => `Алерт бюджета: Вы достигли лимита по ${p.category}. Пора притормозить?`
    },
    over_budget: {
      en: (p) => `Oops! You've exceeded your ${p.category} budget. Want to adjust it?`,
      ru: (p) => `Упс! Вы превысили бюджет по ${p.category}. Хотите скорректировать?`
    },
    saving_goal: {
      en: "You're doing great! You’ve spent less than usual this week. Keep it up!",
      ru: "Отличная работа! Вы потратили меньше обычного на этой неделе. Так держать!"
    }
  },
  aggressive: {
    urgent: {
      en: "Unrecorded expenses detected? (Probably). Open Spendly and stay accurate!",
      ru: "Обнаружены неучтенные расходы? (Вероятно). Открой Spendly и будь точен!"
    },
    direct: {
      en: "Hey! Your budget won't track itself. Log your spending now.",
      ru: "Эй! Бюджет сам себя не посчитает. Запиши расходы сейчас."
    },
    provocative: {
      en: "Is your wallet getting lighter? Make sure you know where the money went.",
      ru: "Кошелек становится легче? Убедись, что знаешь, куда ушли деньги."
    },
    persistence: {
      en: "Quick reminder: Accuracy is key. It takes only 10 seconds to add a transaction.",
      ru: "Напоминание: Точность — это ключ. Добавление транзакции занимает всего 10 секунд."
    }
  },
  retention: {
    friendly: {
      en: "We miss you! Come back and see how your savings are doing.",
      ru: "Мы скучаем! Возвращайся и посмотри, как дела у твоих накоплений."
    },
    insight_based: {
      en: "It’s been a while. See your weekly spending summary inside.",
      ru: "Давно не виделись. Твой еженедельный отчет внутри."
    },
    goal_focused: {
      en: "Ready to reach your financial goals? Let's get back to tracking!",
      ru: "Готов достичь финансовых целей? Давай вернемся к учету!"
    }
  }
};

/**
 * Helper to get a random notification message from a category
 */
export function getNotificationMessage(
  category: NotificationCategory,
  locale: Language,
  params?: Record<string, string | number>,
  variant?: NotificationVariant
): string {
  const categoryTemplates = NOTIFICATION_STRINGS[category];
  if (!categoryTemplates) return "";

  let selectedTemplate: NotificationTemplate;

  if (variant && categoryTemplates[variant]) {
    selectedTemplate = categoryTemplates[variant];
  } else {
    // Pick random variant
    const variants = Object.values(categoryTemplates);
    selectedTemplate = variants[Math.floor(Math.random() * variants.length)];
  }

  // Fallback to 'en' if locale not found
  const raw = (selectedTemplate as any)[locale] || selectedTemplate.en;

  if (typeof raw === "function") {
    return raw(params || {});
  }
  return raw;
}
