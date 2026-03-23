import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { DEFAULT_LOCALE, isSupportedLanguage } from "@/i18n/config";
import type { Language } from "@/types/locale";
import { getTranslations } from "next-intl/server";
import { processNotificationQueue } from "@/lib/notificationProcessor";
import { getUserPreferredLanguage } from "@/lib/i18n/user-locale";

// POST /api/notifications/subscribe - подписка на push-уведомления
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req);
    const body = await req.json();

    const localeCookie =
      req.cookies.get("NEXT_LOCALE")?.value ||
      req.cookies.get("spendly_locale")?.value ||
      DEFAULT_LOCALE;
    const locale = isSupportedLanguage(localeCookie || "")
      ? (localeCookie as any)
      : DEFAULT_LOCALE;
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    const tNotifications = await getTranslations({
      locale,
      namespace: "notifications",
    });

    const { subscription, send_test_push } = body;

    // Валидация входных данных
    const endpoint: unknown = subscription?.endpoint;
    const p256dh: unknown = subscription?.keys?.p256dh;
    const auth: unknown = subscription?.keys?.auth;

    const isNonEmptyString = (v: unknown) =>
      typeof v === "string" && v.trim().length > 0;
    if (
      !isNonEmptyString(endpoint) ||
      !isNonEmptyString(p256dh) ||
      !isNonEmptyString(auth)
    ) {
      return NextResponse.json(
        { error: tErrors("notifications.subscriptionInvalid") },
        { status: 400 },
      );
    }
    try {
      // валидируем, что endpoint — корректный URL
      new URL(endpoint as string);
    } catch {
      return NextResponse.json(
        { error: tErrors("notifications.subscriptionInvalid") },
        { status: 400 },
      );
    }

    const userAgent = req.headers.get("user-agent") || "Unknown";

    // Поиск существующей записи по (user_id, endpoint)
    const { data: existing, error: existingErr } = await supabase
      .from("notification_subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .eq("endpoint", endpoint as string)
      .single();

    let targetId: string | null = null;

    if (existingErr && (existingErr as any).code === "PGRST116") {
      // Нет записи — вставляем
      const { data: inserted, error: insertErr } = await supabase
        .from("notification_subscriptions")
        .insert({
          user_id: user.id,
          endpoint: endpoint as string,
          p256dh_key: p256dh as string,
          auth_key: auth as string,
          user_agent: userAgent,
          is_active: true,
        })
        .select("id")
        .single();

      if (insertErr) {
        console.error("Error saving push subscription (insert):", insertErr);
        return NextResponse.json(
          { error: tErrors("notifications.subscriptionSaveFailed") },
          { status: 500 },
        );
      }
      targetId = inserted.id;
    } else if (existingErr) {
      console.error("Error querying subscription:", existingErr);
      return NextResponse.json(
        { error: tErrors("notifications.subscriptionSaveFailed") },
        { status: 500 },
      );
    } else {
      // Обновляем существующую запись
      const { data: updated, error: updateErr } = await supabase
        .from("notification_subscriptions")
        .update({
          p256dh_key: p256dh as string,
          auth_key: auth as string,
          user_agent: userAgent,
          is_active: true,
        })
        .eq("id", existing!.id)
        .select("id")
        .single();

      if (updateErr) {
        console.error("Error saving push subscription (update):", updateErr);
        return NextResponse.json(
          { error: tErrors("notifications.subscriptionSaveFailed") },
          { status: 500 },
        );
      }
      targetId = updated.id;
    }

    // Деактивируем дубликаты с тем же endpoint у этого пользователя
    if (targetId) {
      const { error: dupErr } = await supabase
        .from("notification_subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("endpoint", endpoint as string)
        .neq("id", targetId);

      if (dupErr) {
        console.warn("Duplicate deactivation warning:", dupErr);
      }
    }

    // Обновляем настройки (включаем push)
    const { error: settingsError } = await supabase
      .from("notification_preferences")
      .update({ push_enabled: true })
      .eq("user_id", user.id);
    if (settingsError) {
      console.error("Error updating push settings:", settingsError);
    }

    // Optional immediate debug push to validate VAPID keys on real device
    let debug: any = null;
    if (send_test_push === true) {
      try {
        const preferredLanguage = await getUserPreferredLanguage(user.id);
        const welcomeByLocale: Record<Language, { title: string; body: string }> = {
          en: {
            title: "You're all set! 🚀",
            body: "Notifications are on. We'll help you keep track of your spending habits.",
          },
          ru: {
            title: "Всё готово! 🚀",
            body: "Уведомления включены. Мы поможем тебе следить за привычками в расходах.",
          },
          uk: {
            title: "Все готово! 🚀",
            body: "Сповіщення увімкнено. Ми допоможемо тобі стежити за витратами.",
          },
          hi: {
            title: "सब तैयार है! 🚀",
            body: "नोटिफ़िकेशन चालू हैं। हम आपके खर्च की आदतों पर नज़र रखने में मदद करेंगे।",
          },
          id: {
            title: "Semua siap! 🚀",
            body: "Notifikasi sudah aktif. Kami akan membantu kamu melacak kebiasaan pengeluaranmu.",
          },
          ja: {
            title: "準備完了！🚀",
            body: "通知をオンにしました。支出の習慣を把握できるようお手伝いします。",
          },
          ko: {
            title: "준비 완료! 🚀",
            body: "알림이 켜졌어요. 지출 습관을 추적할 수 있도록 도와드릴게요.",
          },
        };
        const welcome = welcomeByLocale[preferredLanguage] ?? welcomeByLocale.en;

        const adminSupabase = getServerSupabaseClient();
        const nowIso = new Date().toISOString();

        const { data: existingTypes, error: typesErr } = await adminSupabase
          .from("notification_queue")
          .select("notification_type")
          .not("notification_type", "is", null)
          .limit(20);

        if (typesErr) {
          debug = { ok: false, stage: "resolve_type", error: typesErr };
          return NextResponse.json({
            success: true,
            message: tNotifications("api.subscriptionSaved"),
            debug,
          });
        }

        const resolvedType =
          (existingTypes || [])
            .map((r: any) => String(r?.notification_type || "").trim())
            .find((v: string) => v.length > 0) || null;

        const candidateTypes = Array.from(
          new Set(
            [
              resolvedType,
              "weekly_summary",
              "daily_reminder",
              "retention",
              "aggressive",
              "budget_warning",
              "budget_overrun",
              "reminder",
              "system",
            ].filter(Boolean),
          ),
        ) as string[];

        let queued: any = null;
        let insertErr: any = null;

        for (const notification_type of candidateTypes) {
          const resp = await adminSupabase
            .from("notification_queue")
            .insert({
              user_id: user.id,
              notification_type,
              title: welcome.title,
              message: welcome.body,
              data: { deepLink: "/dashboard", tag: "spendly-welcome" },
              send_push: true,
              send_email: false,
              scheduled_for: nowIso,
              status: "pending",
              attempts: 0,
              max_attempts: 1,
            })
            .select()
            .single();

          if (!resp.error) {
            queued = resp.data;
            insertErr = null;
            break;
          }

          const code = String((resp.error as any)?.code || "");
          const msg = String((resp.error as any)?.message || "");
          if (
            code === "22P02" &&
            msg.toLowerCase().includes("enum notification_type")
          ) {
            insertErr = resp.error;
            continue;
          }

          insertErr = resp.error;
          break;
        }

        if (insertErr) {
          debug = {
            ok: false,
            stage: "enqueue",
            error: insertErr,
            attemptedTypes: candidateTypes,
          };
        } else {
          const processor = await processNotificationQueue(adminSupabase as any);
          debug = { ok: true, queued, processor };
        }
      } catch (e: any) {
        debug = { ok: false, stage: "exception", error: e?.message || String(e) };
      }
    }

    return NextResponse.json({
      success: true,
      message: tNotifications("api.subscriptionSaved"),
      debug,
    });
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

// DELETE /api/notifications/subscribe - отписка от push-уведомлений
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req);
    const body = await req.json();

    const localeCookie =
      req.cookies.get("NEXT_LOCALE")?.value ||
      req.cookies.get("spendly_locale")?.value ||
      DEFAULT_LOCALE;
    const locale = isSupportedLanguage(localeCookie || "")
      ? (localeCookie as any)
      : DEFAULT_LOCALE;
    const tErrors = await getTranslations({ locale, namespace: "errors" });
    const tNotifications = await getTranslations({
      locale,
      namespace: "notifications",
    });

    const { endpoint } = body;

    if (endpoint) {
      // Деактивируем конкретную подписку
      const { error } = await supabase
        .from("notification_subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.id)
        .eq("endpoint", endpoint);

      if (error) {
        console.error("Error deactivating push subscription:", error);
        return NextResponse.json(
          { error: tErrors("notifications.deactivateFailed") },
          { status: 500 },
        );
      }
    } else {
      // Деактивируем все подписки пользователя
      const { error } = await supabase
        .from("notification_subscriptions")
        .update({ is_active: false })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deactivating all push subscriptions:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    // Обновляем настройки пользователя (таблица notification_preferences)
    const { error: settingsError } = await supabase
      .from("notification_preferences")
      .update({ push_enabled: false })
      .eq("user_id", user.id);

    if (settingsError) {
      console.error("Error updating push settings:", settingsError);
    }

    return NextResponse.json({
      success: true,
      message: tNotifications("api.subscriptionRemoved"),
    });
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
