import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getTranslations } from "next-intl/server";

// GET /api/notifications/preferences - получение настроек уведомлений
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req);
    const tErrors = await getTranslations({ locale, namespace: "errors" });

    const selectWithLocale =
      "id, user_id, locale, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, created_at, updated_at";
    const selectNoLocale =
      "id, user_id, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, created_at, updated_at";

    let data: any = null;
    let error: any = null;

    const defaultSettings = () => {
      const now = new Date().toISOString();
      return {
        id: null,
        user_id: user.id,
        locale,
        frequency: "gentle" as const,
        push_enabled: false,
        email_enabled: true,
        quiet_hours_enabled: false,
        quiet_hours_start: null,
        quiet_hours_end: null,
        quiet_hours_timezone: null,
        created_at: now,
        updated_at: now,
      };
    };

    const first = await supabase
      .from("notification_preferences")
      .select(selectWithLocale)
      .eq("user_id", user.id)
      .single();

    data = first.data;
    error = first.error;

    const errMsg = String((error as any)?.message || "");
    const errCode = String((error as any)?.code || "");
    const missingLocaleColumn =
      (errCode === "42703" || errCode === "PGRST204" || errMsg.toLowerCase().includes("does not exist")) &&
      errMsg.toLowerCase().includes("locale");

    if (error && missingLocaleColumn) {
      const second = await supabase
        .from("notification_preferences")
        .select(selectNoLocale)
        .eq("user_id", user.id)
        .single();
      data = second.data;
      error = second.error;
    }

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching notification preferences:", error);
      return NextResponse.json(
        {
          settings: defaultSettings(),
          error: tErrors("notifications.fetchFailed"),
        },
        { status: 200 },
      );
    }

    const validFrequencies = [
      "disabled",
      "gentle",
      "aggressive",
      "relentless",
    ] as const;

    const mapRowToSettings = (row: any) => {
      const dbFreq = row.engagement_frequency;
      const bothOff = row.push_enabled === false && row.email_enabled === false;
      const normalizedFreq = bothOff
        ? "disabled"
        : validFrequencies.includes(dbFreq)
          ? dbFreq
          : "gentle";

      const normalizedLocale =
        typeof row.locale === "string" && isSupportedLanguage(row.locale)
          ? row.locale
          : "en";

      return {
        id: row.id,
        user_id: row.user_id,
        locale: normalizedLocale,
        frequency: normalizedFreq,
        push_enabled: row.push_enabled ?? false,
        email_enabled: row.email_enabled ?? true,
        quiet_hours_enabled: row.quiet_hours_enabled ?? false,
        quiet_hours_start: row.quiet_hours_start ?? null,
        quiet_hours_end: row.quiet_hours_end ?? null,
        quiet_hours_timezone: row.quiet_hours_timezone ?? null,
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at:
          row.updated_at ?? row.created_at ?? new Date().toISOString(),
      };
    };

    // Если настроек нет — создаем дефолтные
    if (!data) {
      const defaultRecordBase = {
        user_id: user.id,
        engagement_frequency: "gentle" as const,
        push_enabled: false,
        email_enabled: true,
      };

      const withLocale = { ...defaultRecordBase, locale };

      let newRow: any = null;
      let createError: any = null;

      const created = await supabase
        .from("notification_preferences")
        .insert(withLocale)
        .select(selectWithLocale)
        .single();

      newRow = created.data;
      createError = created.error;

      const createMsg = String((createError as any)?.message || "");
      const createCode = String((createError as any)?.code || "");
      const createMissingLocale =
        (createCode === "42703" || createCode === "PGRST204" || createMsg.toLowerCase().includes("does not exist")) &&
        createMsg.toLowerCase().includes("locale");

      if (createError && createMissingLocale) {
        const created2 = await supabase
          .from("notification_preferences")
          .insert(defaultRecordBase)
          .select(selectNoLocale)
          .single();
        newRow = created2.data;
        createError = created2.error;
      }

      if (createError) {
        console.error("Error creating default preferences:", createError);
        return NextResponse.json(
          { settings: defaultSettings(), error: createError.message },
          { status: 200 },
        );
      }

      return NextResponse.json({ settings: mapRowToSettings(newRow) });
    }

    return NextResponse.json({ settings: mapRowToSettings(data) });
  } catch (error) {
    console.error("API Error:", error);
    const localeCookie =
      req.cookies.get("NEXT_LOCALE")?.value ||
      req.cookies.get("spendly_locale")?.value ||
      DEFAULT_LOCALE;
    const locale = isSupportedLanguage(localeCookie || "")
      ? (localeCookie as any)
      : DEFAULT_LOCALE;
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : tErrors("common.internalServerError"),
      },
      { status: 500 },
    );
  }
}

// PUT /api/notifications/preferences - обновление настроек уведомлений
export async function PUT(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req);
    const body = await req.json();

    const tErrors = await getTranslations({ locale, namespace: "errors" });

    const inferredTimeZone = (req.headers.get("x-vercel-ip-timezone") || "").trim();

    const {
      frequency,
      push_enabled,
      email_enabled,
      locale: prefLocale,
      quiet_hours_timezone,
    } = body;

    // Валидация
    const validFrequencies = ["disabled", "gentle", "aggressive", "relentless"];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: tErrors("notifications.invalidAction") },
        { status: 400 },
      );
    }

    if (
      prefLocale !== undefined &&
      (typeof prefLocale !== "string" || !isSupportedLanguage(prefLocale))
    ) {
      return NextResponse.json(
        { error: tErrors("notifications.invalidAction") },
        { status: 400 },
      );
    }

    if (quiet_hours_timezone !== undefined) {
      if (typeof quiet_hours_timezone !== "string") {
        return NextResponse.json(
          { error: tErrors("notifications.invalidAction") },
          { status: 400 },
        );
      }
      if (quiet_hours_timezone.trim().length > 100) {
        return NextResponse.json(
          { error: tErrors("notifications.invalidAction") },
          { status: 400 },
        );
      }
    }

    const updateData: any = {};
    if (frequency !== undefined) updateData.engagement_frequency = frequency;
    if (push_enabled !== undefined) updateData.push_enabled = push_enabled;
    if (email_enabled !== undefined) updateData.email_enabled = email_enabled;
    if (prefLocale !== undefined) updateData.locale = prefLocale;
    if (quiet_hours_timezone !== undefined) {
      updateData.quiet_hours_timezone = quiet_hours_timezone.trim() || null;
    }

    if (
      inferredTimeZone &&
      inferredTimeZone.length <= 100 &&
      inferredTimeZone.toUpperCase() !== "UTC" &&
      inferredTimeZone.includes("/")
    ) {
      const incoming = typeof quiet_hours_timezone === "string" ? quiet_hours_timezone.trim() : undefined;
      if (!incoming || incoming.toUpperCase() === "UTC") {
        updateData.quiet_hours_timezone = inferredTimeZone;
      }
    }

    // Не трогаем updated_at напрямую — пусть триггер/БД обновляют, если настроено

    const selectWithLocale =
      "id, user_id, locale, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, created_at, updated_at";
    const selectNoLocale =
      "id, user_id, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, created_at, updated_at";

    const updatedAttempt = await supabase
      .from("notification_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .select(selectWithLocale)
      .single();

    let data: any = updatedAttempt.data;
    let error: any = updatedAttempt.error;

    const errMsg = String((error as any)?.message || "");
    const errCode = String((error as any)?.code || "");
    const missingLocaleColumn =
      (errCode === "42703" || errMsg.toLowerCase().includes("does not exist")) &&
      errMsg.toLowerCase().includes("locale");

    if (error && missingLocaleColumn) {
      const safeUpdateData = { ...updateData };
      delete safeUpdateData.locale;
      const updatedAttempt2 = await supabase
        .from("notification_preferences")
        .update(safeUpdateData)
        .eq("user_id", user.id)
        .select(selectNoLocale)
        .single();
      data = updatedAttempt2.data;
      error = updatedAttempt2.error;
    }

    if (error) {
      const isDisabledRequested = frequency === "disabled";
      const enumError =
        (error.message && error.message.toLowerCase().includes("enum")) ||
        (error.details && error.details.toLowerCase().includes("enum"));

      if (isDisabledRequested && enumError) {
        // Фолбэк: выключаем каналы, оставляем текущую частоту в БД
        const { data: fbData, error: fbErr } = await supabase
          .from("notification_preferences")
          .update({ push_enabled: false, email_enabled: false })
          .eq("user_id", user.id)
          .select(
            "id, user_id, locale, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone, created_at, updated_at",
          )
          .single();

        if (fbErr) {
          console.error("Fallback update error:", fbErr);
          return NextResponse.json({ error: fbErr.message }, { status: 500 });
        }

        const updated = {
          id: fbData.id,
          user_id: fbData.user_id,
          locale:
            typeof fbData.locale === "string" && isSupportedLanguage(fbData.locale)
              ? fbData.locale
              : locale,
          frequency: "disabled" as const,
          push_enabled: fbData.push_enabled,
          email_enabled: fbData.email_enabled,
          quiet_hours_enabled: (fbData as any).quiet_hours_enabled ?? false,
          quiet_hours_start: (fbData as any).quiet_hours_start ?? null,
          quiet_hours_end: (fbData as any).quiet_hours_end ?? null,
          quiet_hours_timezone: (fbData as any).quiet_hours_timezone ?? null,
          created_at: fbData.created_at,
          updated_at: fbData.updated_at,
        };
        return NextResponse.json({ settings: updated });
      }

      console.error("Error updating notification preferences:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const updated = {
      id: data.id,
      user_id: data.user_id,
      locale:
        typeof (data as any).locale === "string" &&
        isSupportedLanguage((data as any).locale)
          ? (data as any).locale
          : "en",
      frequency: data.engagement_frequency,
      push_enabled: data.push_enabled,
      email_enabled: data.email_enabled,
      quiet_hours_enabled: (data as any).quiet_hours_enabled ?? false,
      quiet_hours_start: (data as any).quiet_hours_start ?? null,
      quiet_hours_end: (data as any).quiet_hours_end ?? null,
      quiet_hours_timezone: (data as any).quiet_hours_timezone ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json({ settings: updated });
  } catch (error) {
    console.error("API Error:", error);
    const localeCookie =
      req.cookies.get("NEXT_LOCALE")?.value ||
      req.cookies.get("spendly_locale")?.value ||
      DEFAULT_LOCALE;
    const locale = isSupportedLanguage(localeCookie || "")
      ? (localeCookie as any)
      : DEFAULT_LOCALE;
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : tErrors("common.internalServerError"),
      },
      { status: 500 },
    );
  }
}
