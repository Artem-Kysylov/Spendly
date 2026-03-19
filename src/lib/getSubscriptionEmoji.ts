/**
 * Maps subscription/transaction titles to appropriate emoji icons
 * @param title - The transaction title to map
 * @returns Emoji string representing the subscription type
 */
export function getSubscriptionEmoji(title: string): string {
  const normalized = title.toLowerCase().trim();

  // Entertainment
  if (normalized.includes("netflix")) return "🍿";
  if (normalized.includes("spotify")) return "🎵";
  if (normalized.includes("youtube")) return "📺";
  if (normalized.includes("disney")) return "✨";
  if (normalized.includes("playstation") || normalized.includes("xbox")) return "🎮";

  // Services and IT
  if (normalized.includes("icloud") || normalized.includes("apple")) return "☁️";
  if (normalized.includes("google") || normalized.includes("drive")) return "🔍";
  if (normalized.includes("chatgpt") || normalized.includes("openai")) return "🤖";
  if (normalized.includes("adobe") || normalized.includes("figma")) return "🎨";
  if (normalized.includes("telegram")) return "✈️";
  if (normalized.includes("notion")) return "📝";

  // Life and Utilities
  if (normalized.includes("rent") || normalized.includes("apartment")) return "🏠";
  if (normalized.includes("gym") || normalized.includes("fitness")) return "🏋️";
  if (normalized.includes("internet") || normalized.includes("wifi")) return "🌐";
  if (normalized.includes("mobile") || normalized.includes("phone")) return "📱";
  if (normalized.includes("amazon")) return "📦";
  if (normalized.includes("tinder")) return "🔥";

  // Fallback
  return "💸";
}
