import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getServerSupabaseClient,
} from "@/lib/serverSupabase";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import { getTranslations } from "next-intl/server";
import { processNotificationQueue } from "@/lib/notificationProcessor";
import { computeNextAllowedTime } from "@/lib/quietHours";

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

    const baseTime = scheduled_for ? new Date(scheduled_for) : new Date();
    const scheduledISO = computeNextAllowedTime(
      baseTime,
      prefsResp.data ?? undefined,
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

    // Дублируем в in‑app notifications для центра уведомлений (анти‑дубли в пределах 1 часа)
    try {
      const notifTypeMap = (t: string) =>
        t === "budget_warning" ? "budget_alert" :
        t === "weekly_reminder" ? "weekly_reminder" :
        "general";

      const candidateType = notifTypeMap(notification_type);
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", title)
        .eq("message", message)
        .eq("type", candidateType)
        .gte("created_at", oneHourAgo)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase
          .from("notifications")
          .insert({
            user_id: user.id,
            title,
            message,
            type: candidateType,
            metadata: { ...(data || {}), queue_id: queuedNotification.id },
            is_read: false,
          });
      }
    } catch (dupErr) {
      console.warn("Queue duplication to in‑app notifications failed:", dupErr);
    }

    // Если уведомление не запланировано на будущее — дергаем внутренний processor
    if (!scheduled_for || new Date(scheduledISO) <= new Date()) {
      try {
        const adminSupabase = getServerSupabaseClient();
        await processNotificationQueue(adminSupabase);
      } catch (edgeError) {
        console.error("Failed to trigger internal processor:", edgeError);
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
