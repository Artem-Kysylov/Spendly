import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getTranslations } from "next-intl/server";

// POST /api/notifications/queue - добавление уведомления в очередь
export async function POST(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req);
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    const tNotifications = await getTranslations({
      locale,
      namespace: "notifications",
    });

    const body = await req.json();
    const {
      notification_type = "general",
      title,
      message,
      data = {},
      action_url,
      send_push = true,
      send_email = false,
      scheduled_for,
      max_attempts = 3,
    } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: tErrors("notifications.titleRequired") },
        { status: 400 },
      );
    }

    const prefsResp = await supabase
      .from("notification_preferences")
      .select(
        "quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone",
      )
      .eq("user_id", user.id)
      .single();

    const computeNextAllowedTime = (base: Date, pref: any) => {
      if (
        !pref?.quiet_hours_enabled ||
        !pref?.quiet_hours_start ||
        !pref?.quiet_hours_end
      )
        return base;
      const [sh, sm] = String(pref.quiet_hours_start)
        .split(":")
        .map((x: string) => parseInt(x, 10));
      const [eh, em] = String(pref.quiet_hours_end)
        .split(":")
        .map((x: string) => parseInt(x, 10));
      const nowMin = base.getHours() * 60 + base.getMinutes();
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      const inQuiet =
        startMin < endMin
          ? nowMin >= startMin && nowMin < endMin
          : nowMin >= startMin || nowMin < endMin;
      if (!inQuiet) return base;
      const next = new Date(base);
      if (startMin < endMin) {
        next.setHours(eh, em, 0, 0);
      } else {
        next.setDate(next.getDate() + (nowMin >= startMin ? 1 : 0));
        next.setHours(eh, em, 0, 0);
      }
      return next;
    };

    const baseTime = scheduled_for ? new Date(scheduled_for) : new Date();
    const scheduledISO = computeNextAllowedTime(
      baseTime,
      prefsResp.data,
    ).toISOString();

    // Добавляем уведомление в очередь
    const { data: queuedNotification, error } = await supabase
      .from("notification_queue")
      .insert({
        user_id: user.id,
        notification_type,
        title,
        message,
        data, // Предполагается, что data содержит deepLink/tag/renotify/badge при необходимости
        action_url,
        send_push,
        send_email,
        scheduled_for: scheduledISO,
        status: "pending",
        attempts: 0,
        max_attempts,
      })
      .select()
      .single();

    if (error) {
      if (String((error as any).code) === "23505") {
        // Дубликат — считаем добавленным
        return NextResponse.json(
          {
            notification: null,
            message: tNotifications("api.queueAdded"),
          },
          { status: 201 },
        );
      }
      console.error("Error adding notification to queue:", error);
      const details =
        process.env.NODE_ENV !== "production"
          ? {
              code: (error as any).code,
              message: (error as any).message,
              details: (error as any).details,
              hint: (error as any).hint,
            }
          : undefined;
      return NextResponse.json(
        { error: tErrors("notifications.queueAddFailed"), details },
        { status: 500 },
      );
    }

    // Если уведомление не запланировано на будущее — дергаем внутренний processor
    if (!scheduled_for || new Date(scheduledISO) <= new Date()) {
      try {
        const processorUrl = `${req.nextUrl.origin}/${locale}/api/notifications/processor`;
        const response = await fetch(processorUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || ""}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          console.warn("Processor call failed:", await response.text());
        }
      } catch (edgeError) {
        console.warn("Failed to trigger internal processor:", edgeError);
      }
    }

    return NextResponse.json(
      {
        notification: queuedNotification,
        message: tNotifications("api.queueAdded"),
      },
      { status: 201 },
    );
  } catch (error) {
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

// GET /api/notifications/queue - получение статуса очереди уведомлений
export async function GET(req: NextRequest) {
  try {
    const { supabase, user, locale } = await getAuthenticatedClient(req);
    const tErrors = await getTranslations({ locale, namespace: "errors" });

    const { searchParams } = new URL(req.url);

    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("notification_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching notification queue:", error);
      return NextResponse.json(
        { error: tErrors("notifications.queueFetchFailed") },
        { status: 500 },
      );
    }
    return NextResponse.json({ notifications: data });
  } catch (error) {
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
