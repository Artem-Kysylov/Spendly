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

export async function saveUserLocaleSettings(payload: SaveUserLocalePayload) {
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

  const supabaseAdmin = getServerSupabaseClient();

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
        console.error("[saveUserLocaleSettings] profiles upsert failed", {
          userId,
          code: (profilesUpsertMinimal.error as any)?.code,
          message: (profilesUpsertMinimal.error as any)?.message,
        });
        throw new Error(profilesUpsertMinimal.error.message);
      }
    } else {
      console.error("[saveUserLocaleSettings] profiles upsert failed", {
        userId,
        code: (profilesUpsertFull.error as any)?.code,
        message: (profilesUpsertFull.error as any)?.message,
      });
      throw new Error(profilesUpsertFull.error.message);
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
    console.error("[saveUserLocaleSettings] user_settings upsert failed", {
      userId,
      code: (settingsUpsert.error as any)?.code,
      message: (settingsUpsert.error as any)?.message,
    });
    throw new Error(settingsUpsert.error.message);
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
        console.error("[saveUserLocaleSettings] users upsert failed", {
          userId,
          code: (usersUpsertMinimal.error as any)?.code,
          message: (usersUpsertMinimal.error as any)?.message,
        });
        throw new Error(usersUpsertMinimal.error.message);
      }
    } else {
      console.error("[saveUserLocaleSettings] users upsert failed", {
        userId,
        code: (usersUpsertFull.error as any)?.code,
        message: (usersUpsertFull.error as any)?.message,
      });
      throw new Error(usersUpsertFull.error.message);
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
