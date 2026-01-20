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

/**
 * Parse a simple transaction pattern locally
 * Patterns supported:
 * - "[Item] [Amount]" (e.g., "Coffee 50", "Taxi 200", "Еда 100")
 * - "[Amount] [Item]" (e.g., "50 Coffee", "200 Taxi")
 */
export function parseTransactionLocally(input: string): ParseResult {
  const trimmed = input.trim();
  
  // Split by whitespace
  const parts = trimmed.split(/\s+/);
  
  let normalizedParts = parts;
  let dateOverride: string | undefined;

  if (parts.length === 3) {
    const singleWordDateMap: Record<string, () => string> = {
      yesterday: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      },
      today: () => new Date().toISOString().split('T')[0],
      tomorrow: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      },
      вчера: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      },
      сегодня: () => new Date().toISOString().split('T')[0],
      завтра: () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split('T')[0];
      },
      вчора: () => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        return d.toISOString().split('T')[0];
      },
      сьогодні: () => new Date().toISOString().split('T')[0],
    };

    const lowerParts = parts.map((p) => p.toLowerCase());
    const dateIdx = lowerParts.findIndex((p) => Object.prototype.hasOwnProperty.call(singleWordDateMap, p));
    if (dateIdx >= 0) {
      dateOverride = singleWordDateMap[lowerParts[dateIdx]]();
      normalizedParts = parts.filter((_, idx) => idx !== dateIdx);
    }
  }

  // Only handle simple 2-part inputs
  if (normalizedParts.length !== 2) {
    return {
      success: false,
      requiresAI: true,
      reason: 'Input has more than 2 parts, requires AI processing',
    };
  }
  
  // Check for date/complex keywords
  if (containsDateKeywords(trimmed)) {
    return {
      success: false,
      requiresAI: true,
      reason: 'Contains date keywords, requires AI for date parsing',
    };
  }
  
  if (containsComplexKeywords(trimmed)) {
    return {
      success: false,
      requiresAI: true,
      reason: 'Contains complex keywords, requires AI processing',
    };
  }
  
  const [first, second] = normalizedParts;
  
  // Try to parse: [Item] [Amount] or [Amount] [Item]
  let title: string;
  let amount: number;
  
  // Remove currency symbols and commas for number parsing
  const cleanNumber = (str: string) => str.replace(/[$€₴₽¥£,\s]/g, '');
  
  const firstAsNumber = parseFloat(cleanNumber(first));
  const secondAsNumber = parseFloat(cleanNumber(second));
  
  if (!isNaN(secondAsNumber) && isNaN(firstAsNumber)) {
    // Pattern: [Item] [Amount] (e.g., "Coffee 50")
    title = first;
    amount = secondAsNumber;
  } else if (!isNaN(firstAsNumber) && isNaN(secondAsNumber)) {
    // Pattern: [Amount] [Item] (e.g., "50 Coffee")
    title = second;
    amount = firstAsNumber;
  } else {
    // Can't determine pattern
    return {
      success: false,
      requiresAI: true,
      reason: 'Cannot determine amount/title pattern',
    };
  }
  
  // Validate amount
  if (amount <= 0 || !isFinite(amount)) {
    return {
      success: false,
      requiresAI: true,
      reason: 'Invalid amount',
    };
  }
  
  // Capitalize first letter of title
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1).toLowerCase();
  
  // Detect category from title keywords
  const detectedCategory = detectCategory(title);
  
  // Get today's date in ISO format
  const today = new Date().toISOString().split('T')[0];
  
  return {
    success: true,
    requiresAI: false,
    transaction: {
      title: capitalizedTitle,
      amount,
      type: 'expense', // Default to expense
      category_name: detectedCategory, // Smart category detection
      date: dateOverride ?? today,
    },
  };
}

/**
 * Check if input should be processed locally or sent to AI
 */
export function shouldProcessLocally(input: string): boolean {
  const result = parseTransactionLocally(input);
  return result.success && !result.requiresAI;
}
