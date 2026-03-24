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
  | "warning_90"
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
      ru: "Время быстрой проверки! Были ли траты сегодня?",
      uk: "Час швидкої перевірки! Були витрати сьогодні?",
      hi: "तेज़ चेक-इन का समय! क्या आज कोई खर्च हुआ?",
      id: "Waktunya cek cepat! Ada pengeluaran hari ini?",
      ja: "さっと確認しましょう。今日は出費がありましたか？",
      ko: "빠른 체크인 시간이에요! 오늘 지출이 있었나요?"
    },
    action_oriented: {
      en: "Keep your streak alive! Log your expenses for today.",
      ru: "Поддержи серию! Запиши свои расходы за сегодня.",
      uk: "Підтримай серію! Запиши витрати за сьогодні.",
      hi: "अपनी स्ट्रीक बनाए रखें! आज के खर्च दर्ज करें।",
      id: "Pertahankan streak-mu! Catat pengeluaran hari ini.",
      ja: "連続記録をキープ！今日の支出を記録しましょう。",
      ko: "연속 기록을 이어가요! 오늘 지출을 기록하세요."
    },
    casual: {
      en: "Evening update: How's your wallet feeling? Add your transactions now.",
      ru: "Вечерний апдейт: Как там твой кошелек? Добавь транзакции сейчас.",
      uk: "Вечірній апдейт: як твій гаманець? Додай транзакції зараз.",
      hi: "शाम का अपडेट: आपका वॉलेट कैसा है? अभी लेन-देन जोड़ें।",
      id: "Update malam: dompetmu gimana? Tambahkan transaksi sekarang.",
      ja: "夜のチェック：お財布の調子はどう？今すぐ取引を追加しよう。",
      ko: "저녁 업데이트: 지갑 상태는 어때요? 지금 거래를 추가하세요."
    },
    short: {
      en: "Don't forget to track your spending! 💰",
      ru: "Не забудь записать расходы! 💰",
      uk: "Не забудь записати витрати! 💰",
      hi: "अपने खर्च ट्रैक करना न भूलें! 💰",
      id: "Jangan lupa catat pengeluaranmu! 💰",
      ja: "支出の記録を忘れずに！💰",
      ko: "지출 기록 잊지 마세요! 💰"
    },
    professional: {
      en: "Stay on top of your finances. Record your daily activity in Spendly.",
      ru: "Держи финансы под контролем. Запиши дневную активность в Spendly.",
      uk: "Тримай фінанси під контролем. Запиши щоденну активність у Spendly.",
      hi: "अपने वित्त पर नियंत्रण रखें। Spendly में रोज़ की गतिविधि दर्ज करें।",
      id: "Tetap kendalikan keuanganmu. Catat aktivitas harianmu di Spendly.",
      ja: "家計を把握しましょう。Spendlyで今日の記録を残してください。",
      ko: "재정을 관리하세요. Spendly에 일일 활동을 기록해요."
    }
  },
  budget_alert: {
    warning_80: {
      en: (p) => `Heads up! You’ve used 80% of your ${p.category} budget.`,
      ru: (p) => `Внимание! Вы использовали 80% бюджета категории ${p.category}.`,
      uk: (p) => `Увага! Ви використали 80% бюджету категорії ${p.category}.`,
      hi: (p) => `ध्यान दें! आपने ${p.category} बजट का 80% उपयोग कर लिया है।`,
      id: (p) => `Perhatian! Kamu sudah memakai 80% anggaran ${p.category}.`,
      ja: (p) => `注意！${p.category} の予算を80%使いました。`,
      ko: (p) => `주의! ${p.category} 예산의 80%를 사용했어요.`
    },
    warning_90: {
      en: (p) => `Careful! You’ve already used 90% of your ${p.category} budget.`,
      ru: (p) => `Осторожно! Вы уже использовали 90% бюджета категории ${p.category}.`,
      uk: (p) => `Обережно! Ви вже використали 90% бюджету категорії ${p.category}.`,
      hi: (p) => `सावधान! आपने ${p.category} बजट का 90% पहले ही उपयोग कर लिया है।`,
      id: (p) => `Hati-hati! Kamu sudah memakai 90% anggaran ${p.category}.`,
      ja: (p) => `注意！${p.category} の予算をすでに90%使っています。`,
      ko: (p) => `주의! ${p.category} 예산의 90%를 이미 사용했어요.`
    },
    limit_reached: {
      en: (p) => `Budget Alert: You've reached your limit for ${p.category}. Time to slow down?`,
      ru: (p) => `Алерт бюджета: Вы достигли лимита по ${p.category}. Пора притормозить?`,
      uk: (p) => `Бюджет: ви досягли ліміту для ${p.category}. Час пригальмувати?`,
      hi: (p) => `बजट अलर्ट: ${p.category} के लिए आपका लिमिट पूरा हो गया है। थोड़ा धीमे?`,
      id: (p) => `Peringatan: kamu sudah mencapai batas anggaran ${p.category}. Saatnya mengerem?`,
      ja: (p) => `予算アラート：${p.category} の上限に達しました。少し抑えますか？`,
      ko: (p) => `예산 알림: ${p.category} 한도에 도달했어요. 속도를 줄일까요?`
    },
    over_budget: {
      en: (p) => `Oops! You've exceeded your ${p.category} budget. Want to adjust it?`,
      ru: (p) => `Упс! Вы превысили бюджет по ${p.category}. Хотите скорректировать?`,
      uk: (p) => `Ой! Ви перевищили бюджет для ${p.category}. Хочете змінити його?`,
      hi: (p) => `ओह! आपने ${p.category} का बजट पार कर लिया है। क्या इसे बदलना चाहेंगे?`,
      id: (p) => `Ups! Kamu melewati anggaran ${p.category}. Mau menyesuaikannya?`,
      ja: (p) => `おっと！${p.category} の予算を超えました。調整しますか？`,
      ko: (p) => `앗! ${p.category} 예산을 초과했어요. 조정할까요?`
    },
    saving_goal: {
      en: "You're doing great! You’ve spent less than usual this week. Keep it up!",
      ru: "Отличная работа! Вы потратили меньше обычного на этой неделе. Так держать!",
      uk: "Чудова робота! Цього тижня ви витратили менше, ніж зазвичай. Так тримати!",
      hi: "शानदार! इस हफ्ते आपने सामान्य से कम खर्च किया है। ऐसे ही जारी रखें!",
      id: "Keren! Minggu ini kamu belanja lebih sedikit dari biasanya. Pertahankan!",
      ja: "いい感じ！今週はいつもより支出が少ないです。この調子で！",
      ko: "좋아요! 이번 주엔 평소보다 덜 썼어요. 계속 유지해요!"
    }
  },
  aggressive: {
    urgent: {
      en: "Unrecorded expenses detected? (Probably). Open Spendly and stay accurate!",
      ru: "Обнаружены неучтенные расходы? (Вероятно). Открой Spendly и будь точен!",
      uk: "Необліковані витрати? (Ймовірно). Відкрий Spendly і веди облік точно!",
      hi: "अनरिकॉर्डेड खर्च? (शायद)। Spendly खोलें और रिकॉर्ड सही रखें!",
      id: "Ada pengeluaran yang belum dicatat? (Mungkin). Buka Spendly dan tetap akurat!",
      ja: "未記録の支出があるかも？Spendlyを開いて正確に記録しよう！",
      ko: "기록 안 된 지출이 있나요? (아마도). Spendly를 열고 정확히 기록하세요!"
    },
    direct: {
      en: "Hey! Your budget won't track itself. Log your spending now.",
      ru: "Эй! Бюджет сам себя не посчитает. Запиши расходы сейчас.",
      uk: "Гей! Бюджет сам себе не порахується. Запиши витрати зараз.",
      hi: "अरे! बजट खुद नहीं गिनेगा। अभी अपने खर्च दर्ज करें।",
      id: "Hei! Anggaran tidak akan mencatat sendiri. Catat pengeluaranmu sekarang.",
      ja: "おーい！予算は勝手に記録されません。今すぐ支出を入力しよう。",
      ko: "야! 예산은 스스로 기록되지 않아요. 지금 지출을 기록하세요."
    },
    provocative: {
      en: "Is your wallet getting lighter? Make sure you know where the money went.",
      ru: "Кошелек становится легче? Убедись, что знаешь, куда ушли деньги.",
      uk: "Гаманець легшає? Переконайся, що знаєш, куди пішли гроші.",
      hi: "वॉलेट हल्का लग रहा है? देख लें पैसा कहाँ गया।",
      id: "Dompet makin tipis? Pastikan kamu tahu uangnya ke mana.",
      ja: "お財布が軽くなってない？お金の行き先を把握しよう。",
      ko: "지갑이 가벼워졌나요? 돈이 어디로 갔는지 확인해요."
    },
    persistence: {
      en: "Quick reminder: Accuracy is key. It takes only 10 seconds to add a transaction.",
      ru: "Напоминание: Точность — это ключ. Добавление транзакции занимает всего 10 секунд.",
      uk: "Нагадування: точність важлива. Додати транзакцію — лише 10 секунд.",
      hi: "छोटा रिमाइंडर: सटीकता जरूरी है। ट्रांज़ैक्शन जोड़ने में सिर्फ 10 सेकंड लगते हैं।",
      id: "Pengingat cepat: Akurasi itu penting. Tambah transaksi cuma 10 detik.",
      ja: "リマインド：正確さが大事。取引追加は10秒でできます。",
      ko: "빠른 알림: 정확성이 핵심이에요. 거래 추가는 10초면 충분해요."
    }
  },
  retention: {
    friendly: {
      en: "We miss you! Come back and see how your savings are doing.",
      ru: "Мы скучаем! Возвращайся и посмотри, как дела у твоих накоплений.",
      uk: "Ми сумуємо! Повертайся й подивись, як твої заощадження.",
      hi: "हम आपको याद कर रहे हैं! वापस आएं और देखें आपकी बचत कैसी चल रही है।",
      id: "Kami kangen! Kembali dan lihat perkembangan tabunganmu.",
      ja: "お久しぶり！貯金の調子を見に戻ってきて。",
      ko: "그리웠어요! 돌아와서 저축 상황을 확인해요."
    },
    insight_based: {
      en: "It’s been a while. See your weekly spending summary inside.",
      ru: "Давно не виделись. Твой еженедельный отчет внутри.",
      uk: "Давно не бачились. Усередині — твій тижневий підсумок витрат.",
      hi: "काफ़ी समय हो गया। अंदर आपका साप्ताहिक खर्च सारांश है।",
      id: "Sudah lama ya. Lihat ringkasan pengeluaran mingguanmu di dalam.",
      ja: "しばらくぶり！中に週次の支出サマリーがあります。",
      ko: "오랜만이에요. 안에서 주간 지출 요약을 확인하세요."
    },
    goal_focused: {
      en: "Ready to reach your financial goals? Let's get back to tracking!",
      ru: "Готов достичь финансовых целей? Давай вернемся к учету!",
      uk: "Готовий досягти фінансових цілей? Повернімося до трекінгу!",
      hi: "अपने वित्तीय लक्ष्य हासिल करने के लिए तैयार? चलिए फिर से ट्रैकिंग शुरू करें!",
      id: "Siap capai tujuan finansialmu? Yuk kembali mencatat!",
      ja: "目標達成の準備はできた？また記録を始めよう！",
      ko: "재무 목표를 달성할 준비됐나요? 다시 기록을 시작해요!"
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
