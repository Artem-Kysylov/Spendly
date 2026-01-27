"use server";

import { cookies } from "next/headers";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { normalizeLocaleSettings } from "@/i18n/detect";
import { isSupportedLanguage } from "@/i18n/config";
import countryData from "../../../../public/data/countries-currencies-languages.json";

type SaveUserLocalePayload = {
  userId: string;
  country?: string;
  currency?: string;
  locale?: string;
};

type SaveUserLocaleStage = "supabase_admin" | "profiles" | "user_settings" | "users";

type SaveUserLocaleResult =
  | { success: true; settings: ReturnType<typeof normalizeLocaleSettings> }
  | {
      success: false;
      settings: ReturnType<typeof normalizeLocaleSettings>;
      stage: SaveUserLocaleStage;
      code?: string;
      message: string;
    };

export async function saveUserLocaleSettings(
  payload: SaveUserLocalePayload,
): Promise<SaveUserLocaleResult> {
  const { userId, country, currency, locale } = payload;
  if (!userId) throw new Error("Missing userId");

  const whitelist = countryData as Array<{ code: string; currency: string; language: string }>;

  const validCountry =
    country && (whitelist.length === 0 || whitelist.some((c) => c.code === country)) ? country : undefined;
  const validCurrency =
    currency && (whitelist.length === 0 || whitelist.some((c) => c.currency === currency))
      ? currency
      : undefined;
  const validLocale =
    locale && isSupportedLanguage(locale) ? locale : undefined;

  const normalized = normalizeLocaleSettings({
    country: validCountry,
    currency: validCurrency,
    locale: validLocale,
  });

  const fail = (opts: {
    stage: SaveUserLocaleStage;
    code?: string;
    message: string;
  }): SaveUserLocaleResult => {
    console.error("[saveUserLocaleSettings] failed", {
      userId,
      stage: opts.stage,
      code: opts.code,
      message: opts.message,
    });
    return { success: false, settings: normalized, ...opts };
  };

  let supabaseAdmin: ReturnType<typeof getServerSupabaseClient>;
  try {
    supabaseAdmin = getServerSupabaseClient();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    // Set cookies even if DB fails
    const cookieStore = cookies();
    cookieStore.set("spendly_locale", normalized.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    cookieStore.set("NEXT_LOCALE", normalized.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return fail({ stage: "supabase_admin", message });
  }

  const isMissingColumnError = (err: unknown) => {
    const code = (err as { code?: string } | null)?.code;
    const message = (err as { message?: string } | null)?.message;
    return (
      code === "42703" ||
      (typeof message === "string" && message.toLowerCase().includes("column") && message.toLowerCase().includes("does not exist"))
    );
  };

  const profilesUpsertFull = await supabaseAdmin
    .from("profiles")
    .upsert(
      [
        {
          id: userId,
          country: normalized.country,
          currency: normalized.currency,
          locale: normalized.locale,
        },
      ],
      { onConflict: "id" },
    )
    .select("id");

  if (profilesUpsertFull.error) {
    if (isMissingColumnError(profilesUpsertFull.error)) {
      const profilesUpsertMinimal = await supabaseAdmin
        .from("profiles")
        .upsert([{ id: userId }], { onConflict: "id" })
        .select("id");

      if (profilesUpsertMinimal.error) {
        const code = (profilesUpsertMinimal.error as any)?.code;
        const message = (profilesUpsertMinimal.error as any)?.message || profilesUpsertMinimal.error.message;
        const result = fail({ stage: "profiles", code, message });

        const cookieStore = cookies();
        cookieStore.set("spendly_locale", normalized.locale, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        cookieStore.set("NEXT_LOCALE", normalized.locale, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        return result;
      }
    } else {
      const code = (profilesUpsertFull.error as any)?.code;
      const message = (profilesUpsertFull.error as any)?.message || profilesUpsertFull.error.message;
      const result = fail({ stage: "profiles", code, message });

      const cookieStore = cookies();
      cookieStore.set("spendly_locale", normalized.locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      cookieStore.set("NEXT_LOCALE", normalized.locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return result;
    }
  }

  const settingsUpsert = await supabaseAdmin
    .from("user_settings")
    .upsert(
      [
        {
          user_id: userId,
          locale: normalized.locale,
        },
      ],
      { onConflict: "user_id" },
    );

  if (settingsUpsert.error) {
    const code = (settingsUpsert.error as any)?.code;
    const message = (settingsUpsert.error as any)?.message || settingsUpsert.error.message;
    const result = fail({ stage: "user_settings", code, message });

    const cookieStore = cookies();
    cookieStore.set("spendly_locale", normalized.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    cookieStore.set("NEXT_LOCALE", normalized.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return result;
  }

  const usersUpsertFull = await supabaseAdmin
    .from("users")
    .upsert(
      [
        {
          id: userId,
          country: normalized.country,
          currency: normalized.currency,
          locale: normalized.locale,
        },
      ],
      { onConflict: "id" },
    )
    .select("id");

  if (usersUpsertFull.error) {
    if (isMissingColumnError(usersUpsertFull.error)) {
      const usersUpsertMinimal = await supabaseAdmin
        .from("users")
        .upsert([{ id: userId }], { onConflict: "id" })
        .select("id");

      if (usersUpsertMinimal.error) {
        const code = (usersUpsertMinimal.error as any)?.code;
        const message = (usersUpsertMinimal.error as any)?.message || usersUpsertMinimal.error.message;
        const result = fail({ stage: "users", code, message });

        const cookieStore = cookies();
        cookieStore.set("spendly_locale", normalized.locale, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        cookieStore.set("NEXT_LOCALE", normalized.locale, {
          path: "/",
          maxAge: 60 * 60 * 24 * 365,
          sameSite: "lax",
        });
        return result;
      }
    } else {
      const code = (usersUpsertFull.error as any)?.code;
      const message = (usersUpsertFull.error as any)?.message || usersUpsertFull.error.message;
      const result = fail({ stage: "users", code, message });

      const cookieStore = cookies();
      cookieStore.set("spendly_locale", normalized.locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      cookieStore.set("NEXT_LOCALE", normalized.locale, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
        sameSite: "lax",
      });
      return result;
    }
  }

  // Set cookies for client/provider sync
  const cookieStore = cookies();
  cookieStore.set("spendly_locale", normalized.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  cookieStore.set("NEXT_LOCALE", normalized.locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return { success: true, settings: normalized };
}
