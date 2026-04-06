/**
 * Local transaction parser for "Economy Mode"
 * Parses simple patterns like "Coffee 50" or "200 Taxi" without calling the LLM
 * Saves tokens by handling simple inputs locally
 */

// Date keywords that require AI processing (multi-language)
const DATE_KEYWORDS = [
  // English
  'yesterday', 'today', 'tomorrow', 'last', 'this', 'monday', 'tuesday', 
  'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'week', 'month',
  // Russian
  'вчера', 'сегодня', 'завтра', 'прошлый', 'этот', 'понедельник', 'вторник',
  'среда', 'четверг', 'пятница', 'суббота', 'воскресенье', 'неделя', 'месяц',
  'в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье',
  // Ukrainian  
  'вчора', 'сьогодні', 'завтра', 'минулий', 'цей', 'понеділок', 'вівторок',
  'середа', 'четвер', "п'ятниця", 'субота', 'неділя', 'тиждень', 'місяць',
  // Japanese
  '昨日', '今日', '明日', '先週', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日',
  // Indonesian
  'kemarin', 'hari ini', 'besok', 'lalu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu',
  // Hindi
  'आज', 'कल', 'पिछले', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार',
  // Korean
  '어제', '오늘', '내일', '지난', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
];

// Complex keywords that require AI processing
const COMPLEX_KEYWORDS = [
  // English
  'bought', 'spent', 'paid', 'received', 'earned', 'got', 'for', 'on', 'at',
  // Russian
  'купил', 'потратил', 'заплатил', 'получил', 'заработал',
  // Ukrainian
  'купив', 'витратив', 'заплатив', 'отримав', 'заробив',
];

const LOCALE_SPLITTER_WORDS: Record<string, string[]> = {
  en: ["and"],
  ru: ["и"],
  uk: ["і", "та", "й"],
  ja: ["と", "そして"],
  id: ["dan"],
  hi: ["और"],
  ko: ["그리고"],
};

const ALL_SPLITTER_WORDS = Array.from(
  new Set(Object.values(LOCALE_SPLITTER_WORDS).flat()),
).sort((a, b) => b.length - a.length);

const CURRENCY_SYMBOLS_REGEX = /[$€£¥₴₽]/g;

// Recurring/subscription keywords (multilingual)
const RECURRING_KEYWORDS = [
  // English
  'subscription', 'monthly', 'every month', 'recurring', 'netflix', 'spotify', 
  'apple music', 'youtube premium', 'amazon prime', 'disney+', 'hbo', 'gym',
  'rent', 'mortgage', 'insurance', 'phone bill', 'internet', 'electricity',
  // Russian
  'подписка', 'ежемесячно', 'каждый месяц', 'аренда', 'ипотека', 'страховка',
  'интернет', 'электричество', 'телефон', 'спортзал',
  // Ukrainian
  'підписка', 'щомісяця', 'кожен місяць', 'оренда', 'іпотека', 'страховка',
  'інтернет', 'електрика', 'телефон', 'спортзал',
  // Japanese
  'サブスクリプション', '毎月', '定期',
  // Indonesian
  'langganan', 'bulanan', 'setiap bulan',
  // Hindi
  'सदस्यता', 'मासिक', 'हर महीने',
  // Korean
  '구독', '월간', '매월',
];

/**
 * Detect if transaction is likely recurring/subscription based on keywords
 */
function detectRecurring(title: string): boolean {
  const lowerTitle = title.toLowerCase();
  return RECURRING_KEYWORDS.some(keyword => lowerTitle.includes(keyword.toLowerCase()));
}

// Keyword-to-category mapping (multilingual)
// Maps common expense keywords to category names
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Transport': [
    // English
    'taxi', 'bolt', 'uber', 'bus', 'metro', 'subway', 'train', 'gas', 'fuel', 'parking',
    // Russian
    'такси', 'метро', 'автобус', 'бензин', 'парковка', 'поезд',
    // Ukrainian
    'таксі', 'метро', 'автобус', 'паливо', 'паркування', 'поїзд',
  ],
  'Food': [
    // English
    'coffee', 'lunch', 'dinner', 'breakfast', 'pizza', 'burger', 'groceries', 'food',
    'beer', 'wine', 'restaurant', 'cafe', 'snack', 'meal',
    // Russian
    'кофе', 'обед', 'ужин', 'завтрак', 'пицца', 'продукты', 'еда',
    'пиво', 'вино', 'ресторан', 'кафе', 'перекус',
    // Ukrainian
    'кава', 'обід', 'вечеря', 'сніданок', 'піца', 'продукти', 'їжа',
    'пиво', 'вино', 'ресторан', 'кафе',
  ],
  'Shopping': [
    // English
    'shop', 'store', 'clothes', 'shoes', 'amazon', 'mall', 'purchase',
    // Russian
    'магазин', 'одежда', 'обувь', 'покупка', 'шопинг',
    // Ukrainian
    'магазин', 'одяг', 'взуття', 'покупка', 'шопінг',
  ],
  'Entertainment': [
    // English
    'movie', 'cinema', 'game', 'netflix', 'spotify', 'concert', 'theater', 'theatre',
    // Russian
    'кино', 'фильм', 'игра', 'концерт', 'театр',
    // Ukrainian
    'кіно', 'фільм', 'гра', 'концерт', 'театр',
  ],
};

/**
 * Detect category from item title using keyword matching
 * Returns the matched category name or "Other" if no match
 */
function detectCategory(title: string): string {
  const lowerTitle = title.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  
  return 'Unbudgeted'; // Default if no keywords match
}

export interface LocalParsedTransaction {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category_name: string;
  date: string; // ISO format YYYY-MM-DD
  is_recurring?: boolean;
  recurrence_day?: number;
}

export interface ParseResult {
  success: boolean;
  transaction?: LocalParsedTransaction;
  transactions?: LocalParsedTransaction[];
  unparsedSegments?: string[];
  requiresAI: boolean;
  reason?: string;
}

/**
 * Check if input contains date keywords that require AI processing
 */
function containsDateKeywords(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return DATE_KEYWORDS.some(keyword => lowerInput.includes(keyword.toLowerCase()));
}

/**
 * Check if input contains complex keywords that require AI processing
 */
function containsComplexKeywords(input: string): boolean {
  const lowerInput = input.toLowerCase();
  return COMPLEX_KEYWORDS.some(keyword => lowerInput.includes(keyword.toLowerCase()));
}

function normalizeLocale(locale?: string): string {
  const base = String(locale || "en")
    .split("-")[0]
    .trim()
    .toLowerCase();
  return base || "en";
}

function toIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
}

function toLastWeekdayIso(targetDay: number): string {
  const d = new Date();
  const currentDayOfWeek = d.getDay();
  let diff = currentDayOfWeek - targetDay;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

const MULTI_WORD_DATE_PATTERNS: Array<{ phrase: string; iso: () => string }> = [
  { phrase: "last monday", iso: () => toLastWeekdayIso(1) },
  { phrase: "last tuesday", iso: () => toLastWeekdayIso(2) },
  { phrase: "last wednesday", iso: () => toLastWeekdayIso(3) },
  { phrase: "last thursday", iso: () => toLastWeekdayIso(4) },
  { phrase: "last friday", iso: () => toLastWeekdayIso(5) },
  { phrase: "last saturday", iso: () => toLastWeekdayIso(6) },
  { phrase: "last sunday", iso: () => toLastWeekdayIso(0) },
  { phrase: "в понедельник", iso: () => toLastWeekdayIso(1) },
  { phrase: "во вторник", iso: () => toLastWeekdayIso(2) },
  { phrase: "в среду", iso: () => toLastWeekdayIso(3) },
  { phrase: "в четверг", iso: () => toLastWeekdayIso(4) },
  { phrase: "в пятницу", iso: () => toLastWeekdayIso(5) },
  { phrase: "в субботу", iso: () => toLastWeekdayIso(6) },
  { phrase: "в воскресенье", iso: () => toLastWeekdayIso(0) },
  { phrase: "в прошлый понедельник", iso: () => toLastWeekdayIso(1) },
  { phrase: "в прошлый вторник", iso: () => toLastWeekdayIso(2) },
  { phrase: "в прошлую среду", iso: () => toLastWeekdayIso(3) },
  { phrase: "в прошлый четверг", iso: () => toLastWeekdayIso(4) },
  { phrase: "в прошлую пятницу", iso: () => toLastWeekdayIso(5) },
  { phrase: "в прошлую субботу", iso: () => toLastWeekdayIso(6) },
  { phrase: "в прошлое воскресенье", iso: () => toLastWeekdayIso(0) },
  { phrase: "у понеділок", iso: () => toLastWeekdayIso(1) },
  { phrase: "у вівторок", iso: () => toLastWeekdayIso(2) },
  { phrase: "у середу", iso: () => toLastWeekdayIso(3) },
  { phrase: "у четвер", iso: () => toLastWeekdayIso(4) },
  { phrase: "у п'ятницю", iso: () => toLastWeekdayIso(5) },
  { phrase: "у суботу", iso: () => toLastWeekdayIso(6) },
  { phrase: "у неділю", iso: () => toLastWeekdayIso(0) },
  { phrase: "минулого понеділка", iso: () => toLastWeekdayIso(1) },
  { phrase: "минулого вівторка", iso: () => toLastWeekdayIso(2) },
  { phrase: "минулої середи", iso: () => toLastWeekdayIso(3) },
  { phrase: "минулого четверга", iso: () => toLastWeekdayIso(4) },
  { phrase: "минулої п'ятниці", iso: () => toLastWeekdayIso(5) },
  { phrase: "минулої суботи", iso: () => toLastWeekdayIso(6) },
  { phrase: "минулої неділі", iso: () => toLastWeekdayIso(0) },
  { phrase: "先週の月曜日", iso: () => toLastWeekdayIso(1) },
  { phrase: "先週の火曜日", iso: () => toLastWeekdayIso(2) },
  { phrase: "先週の水曜日", iso: () => toLastWeekdayIso(3) },
  { phrase: "先週の木曜日", iso: () => toLastWeekdayIso(4) },
  { phrase: "先週の金曜日", iso: () => toLastWeekdayIso(5) },
  { phrase: "先週の土曜日", iso: () => toLastWeekdayIso(6) },
  { phrase: "先週の日曜日", iso: () => toLastWeekdayIso(0) },
  { phrase: "senin lalu", iso: () => toLastWeekdayIso(1) },
  { phrase: "selasa lalu", iso: () => toLastWeekdayIso(2) },
  { phrase: "rabu lalu", iso: () => toLastWeekdayIso(3) },
  { phrase: "kamis lalu", iso: () => toLastWeekdayIso(4) },
  { phrase: "jumat lalu", iso: () => toLastWeekdayIso(5) },
  { phrase: "sabtu lalu", iso: () => toLastWeekdayIso(6) },
  { phrase: "minggu lalu", iso: () => toLastWeekdayIso(0) },
  { phrase: "पिछले सोमवार", iso: () => toLastWeekdayIso(1) },
  { phrase: "पिछले मंगलवार", iso: () => toLastWeekdayIso(2) },
  { phrase: "पिछले बुधवार", iso: () => toLastWeekdayIso(3) },
  { phrase: "पिछले गुरुवार", iso: () => toLastWeekdayIso(4) },
  { phrase: "पिछले शुक्रवार", iso: () => toLastWeekdayIso(5) },
  { phrase: "पिछले शनिवार", iso: () => toLastWeekdayIso(6) },
  { phrase: "पिछले रविवार", iso: () => toLastWeekdayIso(0) },
  { phrase: "지난 월요일", iso: () => toLastWeekdayIso(1) },
  { phrase: "지난 화요일", iso: () => toLastWeekdayIso(2) },
  { phrase: "지난 수요일", iso: () => toLastWeekdayIso(3) },
  { phrase: "지난 목요일", iso: () => toLastWeekdayIso(4) },
  { phrase: "지난 금요일", iso: () => toLastWeekdayIso(5) },
  { phrase: "지난 토요일", iso: () => toLastWeekdayIso(6) },
  { phrase: "지난 일요일", iso: () => toLastWeekdayIso(0) },
  { phrase: "hari ini", iso: () => toIsoDate(0) },
];

function singleWordDateToIso(word: string): string | undefined {
  const w = word.trim().toLowerCase();
  if (w === "yesterday" || w === "вчера" || w === "вчора") return toIsoDate(-1);
  if (w === "today" || w === "сегодня" || w === "сьогодні") return toIsoDate(0);
  if (w === "tomorrow" || w === "завтра") return toIsoDate(1);
  if (w === "昨日" || w === "kemarin" || w === "어제") return toIsoDate(-1);
  if (w === "今日" || w === "आज" || w === "오늘") return toIsoDate(0);
  if (w === "明日" || w === "besok" || w === "내일") return toIsoDate(1);
  if (w === "monday") return toLastWeekdayIso(1);
  if (w === "tuesday") return toLastWeekdayIso(2);
  if (w === "wednesday") return toLastWeekdayIso(3);
  if (w === "thursday") return toLastWeekdayIso(4);
  if (w === "friday") return toLastWeekdayIso(5);
  if (w === "saturday") return toLastWeekdayIso(6);
  if (w === "sunday") return toLastWeekdayIso(0);
  if (w === "понедельник") return toLastWeekdayIso(1);
  if (w === "вторник") return toLastWeekdayIso(2);
  if (w === "среда") return toLastWeekdayIso(3);
  if (w === "четверг") return toLastWeekdayIso(4);
  if (w === "пятница") return toLastWeekdayIso(5);
  if (w === "суббота") return toLastWeekdayIso(6);
  if (w === "воскресенье") return toLastWeekdayIso(0);
  if (w === "понеділок") return toLastWeekdayIso(1);
  if (w === "вівторок") return toLastWeekdayIso(2);
  if (w === "середа") return toLastWeekdayIso(3);
  if (w === "четвер") return toLastWeekdayIso(4);
  if (w === "п'ятниця") return toLastWeekdayIso(5);
  if (w === "субота") return toLastWeekdayIso(6);
  if (w === "неділя") return toLastWeekdayIso(0);
  if (w === "月曜日") return toLastWeekdayIso(1);
  if (w === "火曜日") return toLastWeekdayIso(2);
  if (w === "水曜日") return toLastWeekdayIso(3);
  if (w === "木曜日") return toLastWeekdayIso(4);
  if (w === "金曜日") return toLastWeekdayIso(5);
  if (w === "土曜日") return toLastWeekdayIso(6);
  if (w === "日曜日") return toLastWeekdayIso(0);
  if (w === "senin") return toLastWeekdayIso(1);
  if (w === "selasa") return toLastWeekdayIso(2);
  if (w === "rabu") return toLastWeekdayIso(3);
  if (w === "kamis") return toLastWeekdayIso(4);
  if (w === "jumat") return toLastWeekdayIso(5);
  if (w === "sabtu") return toLastWeekdayIso(6);
  if (w === "minggu") return toLastWeekdayIso(0);
  if (w === "सोमवार") return toLastWeekdayIso(1);
  if (w === "मंगलवार") return toLastWeekdayIso(2);
  if (w === "बुधवार") return toLastWeekdayIso(3);
  if (w === "गुरुवार") return toLastWeekdayIso(4);
  if (w === "शुक्रवार") return toLastWeekdayIso(5);
  if (w === "शनिवार") return toLastWeekdayIso(6);
  if (w === "रविवार") return toLastWeekdayIso(0);
  if (w === "월요일") return toLastWeekdayIso(1);
  if (w === "화요일") return toLastWeekdayIso(2);
  if (w === "수요일") return toLastWeekdayIso(3);
  if (w === "목요일") return toLastWeekdayIso(4);
  if (w === "금요일") return toLastWeekdayIso(5);
  if (w === "토요일") return toLastWeekdayIso(6);
  if (w === "일요일") return toLastWeekdayIso(0);
  return undefined;
}

function extractSupportedDateExpression(input: string): { text: string; date?: string } {
  const sortedPatterns = [...MULTI_WORD_DATE_PATTERNS].sort((a, b) => b.phrase.length - a.phrase.length);
  const lowerInput = input.toLowerCase();

  for (const pattern of sortedPatterns) {
    const lowerPhrase = pattern.phrase.toLowerCase();
    const index = lowerInput.indexOf(lowerPhrase);
    if (index === -1) continue;

    const before = input.slice(0, index).trim();
    const after = input.slice(index + pattern.phrase.length).trim();
    return {
      text: [before, after].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      date: pattern.iso(),
    };
  }

  return extractGlobalSingleWordDate(input);
}

const ENGLISH_PREPOSITIONAL_WEEKDAY_PATTERNS: Array<{ phrase: string; iso: () => string }> = [
  { phrase: "on monday", iso: () => toLastWeekdayIso(1) },
  { phrase: "on tuesday", iso: () => toLastWeekdayIso(2) },
  { phrase: "on wednesday", iso: () => toLastWeekdayIso(3) },
  { phrase: "on thursday", iso: () => toLastWeekdayIso(4) },
  { phrase: "on friday", iso: () => toLastWeekdayIso(5) },
  { phrase: "on saturday", iso: () => toLastWeekdayIso(6) },
  { phrase: "on sunday", iso: () => toLastWeekdayIso(0) },
];

function extractGlobalSingleWordDate(input: string): { text: string; date?: string } {
  const lowerInput = input.toLowerCase();
  for (const pattern of ENGLISH_PREPOSITIONAL_WEEKDAY_PATTERNS) {
    const index = lowerInput.indexOf(pattern.phrase);
    if (index === -1) continue;

    const before = input.slice(0, index).trim();
    const after = input.slice(index + pattern.phrase.length).trim();
    return {
      text: [before, after].filter(Boolean).join(" ").replace(/\s+/g, " ").trim(),
      date: pattern.iso(),
    };
  }

  const parts = input.trim().split(/\s+/);
  if (parts.length < 2) return { text: input.trim() };

  const lastRaw = parts[parts.length - 1];
  const last = lastRaw.replace(/[.,!?]+$/g, "");
  const iso = singleWordDateToIso(last);
  if (!iso) return { text: input.trim() };

  const text = parts.slice(0, -1).join(" ").trim();
  return { text, date: iso };
}

function replaceLocaleSplittersWithComma(input: string, locale: string): string {
  const localeWords = LOCALE_SPLITTER_WORDS[locale] || [];
  const words = Array.from(new Set([...ALL_SPLITTER_WORDS, ...localeWords]));
  let out = input;
  for (const w of words) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|\\s+)${escaped}(?=\\s+|$)`, "giu");
    out = out.replace(re, ",");
  }
  return out;
}

function splitIntoSegments(input: string, locale: string): string[] {
  let out = input;
  out = out.replace(/[\n;]+/g, ",");
  out = out.replace(/[&+]+/g, ",");
  out = replaceLocaleSplittersWithComma(out, locale);

  return out
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseAmountToken(token: string): number {
  const raw = token.replace(CURRENCY_SYMBOLS_REGEX, "").trim();
  if (!raw) return Number.NaN;

  const decimalComma = /^\d+,\d+$/;
  const thousandsComma = /^\d{1,3}(,\d{3})+(\.\d+)?$/;

  let normalized = raw;
  if (decimalComma.test(raw) && !raw.includes(".")) {
    normalized = raw.replace(",", ".");
  } else if (raw.includes(",") && thousandsComma.test(raw)) {
    normalized = raw.replace(/,/g, "");
  } else {
    normalized = raw.replace(/,/g, "");
  }

  normalized = normalized.replace(/\s+/g, "");
  return parseFloat(normalized);
}

function hasUnsupportedDateKeywords(input: string): boolean {
  const lowerInput = input.toLowerCase();
  for (const keyword of DATE_KEYWORDS) {
    const lowerKw = keyword.toLowerCase();
    if (!lowerInput.includes(lowerKw)) continue;
    if (singleWordDateToIso(lowerKw)) continue;
    return true;
  }
  return false;
}

function parseSegment(segment: string, globalDate?: string): LocalParsedTransaction | null {
  const trimmed = segment.trim();
  if (!trimmed) return null;

  const tokens = trimmed.split(/\s+/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length < 2) return null;

  let dateOverride: string | undefined;
  const kept: string[] = [];
  for (const t of tokens) {
    const cleaned = t.replace(/[.,!?]+$/g, "");
    const d = singleWordDateToIso(cleaned);
    if (!dateOverride && d) {
      dateOverride = d;
      continue;
    }
    kept.push(t);
  }

  const amountIdxs: number[] = [];
  const amounts: number[] = [];
  for (let i = 0; i < kept.length; i++) {
    const n = parseAmountToken(kept[i]);
    if (Number.isFinite(n)) {
      amountIdxs.push(i);
      amounts.push(n);
    }
  }

  if (amountIdxs.length !== 1) return null;
  const amount = amounts[0];
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const titleTokens = kept.filter((_, idx) => idx !== amountIdxs[0]);
  const title = titleTokens.join(" ").trim();
  if (!title) return null;

  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  const detectedCategory = detectCategory(title);
  const isRecurring = detectRecurring(title);
  
  // Use full ISO timestamp with current time for proper chronological sorting
  const now = new Date();
  const getDateWithCurrentTime = (dateStr?: string): string => {
    if (!dateStr) return now.toISOString().split('T')[0];
    
    // Parse the date and merge with current time
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return now.toISOString().split('T')[0];
    
    // Keep the date, but use current time
    parsed.setHours(now.getHours());
    parsed.setMinutes(now.getMinutes());
    parsed.setSeconds(now.getSeconds());
    parsed.setMilliseconds(now.getMilliseconds());
    
    return parsed.toISOString().split('T')[0];
  };

  return {
    title: capitalizedTitle,
    amount,
    type: 'expense',
    category_name: detectedCategory,
    date: getDateWithCurrentTime(dateOverride ?? globalDate),
    is_recurring: isRecurring,
    recurrence_day: isRecurring ? new Date().getDate() : undefined,
  };
}

/**
 * Parse a simple transaction pattern locally
 * Patterns supported:
 * - "[Item] [Amount]" (e.g., "Coffee 50", "Taxi 200", "Еда 100")
 * - "[Amount] [Item]" (e.g., "50 Coffee", "200 Taxi")
 */
export function parseTransactionLocally(input: string, locale?: string): ParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      success: false,
      requiresAI: true,
      reason: "Empty input",
    };
  }

  const currentLocale = normalizeLocale(locale);

  const { text, date: globalDate } = extractSupportedDateExpression(trimmed);

  if (containsComplexKeywords(text)) {
    return {
      success: false,
      requiresAI: true,
      reason: "Contains complex keywords, requires AI processing",
    };
  }

  if (hasUnsupportedDateKeywords(text)) {
    return {
      success: false,
      requiresAI: true,
      reason: "Contains unsupported date keywords, requires AI processing",
    };
  }

  const segments = splitIntoSegments(text, currentLocale);

  if (segments.length === 0) {
    return {
      success: false,
      requiresAI: true,
      reason: "No segments to parse",
    };
  }

  const transactions: LocalParsedTransaction[] = [];
  const unparsedSegments: string[] = [];

  for (const segment of segments) {
    const tx = parseSegment(segment, globalDate);
    if (tx) transactions.push(tx);
    else unparsedSegments.push(segment);
  }

  if (transactions.length === 0) {
    return {
      success: false,
      requiresAI: true,
      reason: "Cannot parse locally",
    };
  }

  const requiresAI = unparsedSegments.length > 0;
  return {
    success: true,
    requiresAI,
    transaction: transactions[0],
    transactions,
    unparsedSegments: unparsedSegments.length > 0 ? unparsedSegments : undefined,
  };
}

/**
 * Check if input should be processed locally or sent to AI
 */
export function shouldProcessLocally(input: string, locale?: string): boolean {
  const result = parseTransactionLocally(input, locale);
  return result.success && !result.requiresAI;
}
