import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import type { Language } from "@/types/locale";

export async function getUserPreferredLanguage(
  userId: string,
): Promise<Language> {
  const supabase = getServerSupabaseClient();
  
  const normalize = (l: unknown): Language => {
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
  } catch {
    // ignore
  }

  // Fallback to checking the users table if user_settings fails or is empty
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
