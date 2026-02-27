import { type NextRequest, NextResponse } from "next/server";
import { isSupportedLanguage } from "@/i18n/config";
import { normalizeLocaleSettings } from "@/i18n/detect";
import {
  getAuthenticatedClient,
  getServerSupabaseClient,
} from "@/lib/serverSupabase";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req);
    const body = await req.json();

    const datasetRes = await fetch(
      new URL("/data/countries-currencies-languages.json", req.url),
    );
    const whitelist = (await datasetRes.json()) as Array<{
      code: string;
      currency: string;
      language: string;
    }>;

    const requestedCountry =
      typeof body.country === "string" ? body.country : undefined;
    const requestedCurrency =
      typeof body.currency === "string" ? body.currency : undefined;
    const requestedLocale =
      typeof body.locale === "string" && isSupportedLanguage(body.locale)
        ? body.locale
        : undefined;

    const validCountry =
      requestedCountry && whitelist.some((c) => c.code === requestedCountry)
        ? requestedCountry
        : undefined;
    const validCurrency =
      requestedCurrency &&
      whitelist.some((c) => c.currency === requestedCurrency)
        ? requestedCurrency
        : undefined;
    const validLocale = requestedLocale;

    let existingCountry: string | undefined;
    let existingCurrency: string | undefined;
    let existingLocale: string | undefined;

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("country,currency,locale")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        const row = data as unknown as Record<string, unknown>;
        existingCountry =
          typeof row.country === "string" ? (row.country as string) : undefined;
        existingCurrency =
          typeof row.currency === "string"
            ? (row.currency as string)
            : undefined;
        existingLocale =
          typeof row.locale === "string" ? (row.locale as string) : undefined;
      }
    } catch {
      // ignore
    }

    const u = user as unknown as { user_metadata?: unknown };
    const metaRaw = u?.user_metadata;
    const meta =
      metaRaw && typeof metaRaw === "object"
        ? (metaRaw as Record<string, unknown>)
        : undefined;
    const metaCountry =
      typeof meta?.country === "string" ? (meta.country as string) : undefined;
    const metaCurrency =
      typeof meta?.currency === "string"
        ? (meta.currency as string)
        : typeof meta?.currency_preference === "string"
          ? (meta.currency_preference as string)
          : undefined;
    const metaLocale =
      typeof meta?.locale === "string" ? (meta.locale as string) : undefined;

    const normalized = normalizeLocaleSettings({
      country: validCountry || existingCountry || metaCountry,
      currency: validCurrency || existingCurrency || metaCurrency,
      locale: validLocale || existingLocale || metaLocale,
    });

    const adminSupabase = getServerSupabaseClient();
    const upsertRes = await adminSupabase.from("user_settings").upsert(
      [
        {
          user_id: user.id,
          country: normalized.country,
          currency: normalized.currency,
          locale: normalized.locale,
        },
      ],
      { onConflict: "user_id" },
    );

    if (upsertRes.error) {
      const e = upsertRes.error as unknown as {
        code?: unknown;
        message?: unknown;
      };
      const code = typeof e.code === "string" ? e.code : "";
      const message = typeof e.message === "string" ? e.message : "";
      console.warn("Upsert user_settings failed:", { code, message });
    }

    // Обновляем метаданные auth пользователя (совместимость)
    await supabase.auth.updateUser({
      data: {
        country: normalized.country,
        currency: normalized.currency,
        currency_preference: normalized.currency,
        locale: normalized.locale,
      },
    });

    const res = NextResponse.json({ success: true, settings: normalized });
    res.cookies.set("spendly_locale", normalized.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    res.cookies.set("NEXT_LOCALE", normalized.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return res;
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
