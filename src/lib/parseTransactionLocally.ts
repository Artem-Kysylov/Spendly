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

const CURRENCY_SYMBOLS_REGEX = /[$€£¥₴₽]/g;

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
  
  return 'Other'; // Default if no keywords match
}

export interface LocalParsedTransaction {
  title: string;
  amount: number;
  type: 'expense' | 'income';
  category_name: string;
  date: string; // ISO format YYYY-MM-DD
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

function singleWordDateToIso(word: string): string | undefined {
  const w = word.trim().toLowerCase();
  if (w === "yesterday" || w === "вчера" || w === "вчора") return toIsoDate(-1);
  if (w === "today" || w === "сегодня" || w === "сьогодні") return toIsoDate(0);
  if (w === "tomorrow" || w === "завтра") return toIsoDate(1);
  return undefined;
}

function extractGlobalSingleWordDate(input: string): { text: string; date?: string } {
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
  const words = LOCALE_SPLITTER_WORDS[locale] || LOCALE_SPLITTER_WORDS.en;
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
  const today = new Date().toISOString().split('T')[0];

  return {
    title: capitalizedTitle,
    amount,
    type: 'expense',
    category_name: detectedCategory,
    date: dateOverride ?? globalDate ?? today,
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

  if (containsComplexKeywords(trimmed)) {
    return {
      success: false,
      requiresAI: true,
      reason: "Contains complex keywords, requires AI processing",
    };
  }

  if (hasUnsupportedDateKeywords(trimmed)) {
    return {
      success: false,
      requiresAI: true,
      reason: "Contains unsupported date keywords, requires AI processing",
    };
  }

  const { text, date: globalDate } = extractGlobalSingleWordDate(trimmed);
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
