import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getTranslations } from "next-intl/server";

// GET /api/notifications/preferences - получение настроек уведомлений
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req);
    const tErrors = await getTranslations({ locale, namespace: "errors" });

    const { data, error } = await supabase
      .from("notification_preferences")
      .select(
        "id, user_id, engagement_frequency, push_enabled, email_enabled, created_at, updated_at",
      )
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching notification preferences:", error);
      return NextResponse.json(
        { error: tErrors("notifications.fetchFailed") },
        { status: 500 },
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

      return {
        id: row.id,
        user_id: row.user_id,
        frequency: normalizedFreq,
        push_enabled: row.push_enabled ?? false,
        email_enabled: row.email_enabled ?? true,
        created_at: row.created_at ?? new Date().toISOString(),
        updated_at:
          row.updated_at ?? row.created_at ?? new Date().toISOString(),
      };
    };

    // Если настроек нет — создаем дефолтные
    if (!data) {
      const defaultRecord = {
        user_id: user.id,
        engagement_frequency: "gentle" as const,
        push_enabled: false,
        email_enabled: true,
      };

      const { data: newRow, error: createError } = await supabase
        .from("notification_preferences")
        .insert(defaultRecord)
        .select(
          "id, user_id, engagement_frequency, push_enabled, email_enabled, created_at, updated_at",
        )
        .single();

      if (createError) {
        console.error("Error creating default preferences:", createError);
        return NextResponse.json(
          { error: createError.message },
          { status: 500 },
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

    const { frequency, push_enabled, email_enabled } = body;

    // Валидация
    const validFrequencies = ["disabled", "gentle", "aggressive", "relentless"];
    if (frequency && !validFrequencies.includes(frequency)) {
      return NextResponse.json(
        { error: tErrors("notifications.invalidAction") },
        { status: 400 },
      );
    }

    const updateData: any = {};
    if (frequency !== undefined) updateData.engagement_frequency = frequency;
    if (push_enabled !== undefined) updateData.push_enabled = push_enabled;
    if (email_enabled !== undefined) updateData.email_enabled = email_enabled;

    // Не трогаем updated_at напрямую — пусть триггер/БД обновляют, если настроено

    const { data, error } = await supabase
      .from("notification_preferences")
      .update(updateData)
      .eq("user_id", user.id)
      .select(
        "id, user_id, engagement_frequency, push_enabled, email_enabled, created_at, updated_at",
      )
      .single();

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
            "id, user_id, engagement_frequency, push_enabled, email_enabled, created_at, updated_at",
          )
          .single();

        if (fbErr) {
          console.error("Fallback update error:", fbErr);
          return NextResponse.json({ error: fbErr.message }, { status: 500 });
        }

        const updated = {
          id: fbData.id,
          user_id: fbData.user_id,
          frequency: "disabled" as const,
          push_enabled: fbData.push_enabled,
          email_enabled: fbData.email_enabled,
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
      frequency: data.engagement_frequency,
      push_enabled: data.push_enabled,
      email_enabled: data.email_enabled,
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
