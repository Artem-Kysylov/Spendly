import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";

export const getServerSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase server credentials are missing");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

// getAuthenticatedClient(req: NextRequest)
export async function getAuthenticatedClient(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid authorization header");
  }

  const token = authHeader.substring(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Invalid or expired token");
  }

  const localeCookie =
    req.cookies.get("NEXT_LOCALE")?.value ||
    req.cookies.get("spendly_locale")?.value ||
    DEFAULT_LOCALE;
  const locale = isSupportedLanguage(localeCookie || "")
    ? (localeCookie as any)
    : DEFAULT_LOCALE;

  return { supabase, user, locale };
}
