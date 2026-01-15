import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { getUserPreferredLanguage } from "@/lib/i18n/user-locale";
import { isSupportedLanguage } from "@/i18n/config";
import type { Language } from "@/types/locale";
import {
  getNotificationMessage,
  NotificationCategory,
  NotificationVariant,
} from "@/lib/notificationStrings";
import { computeNextAllowedTime } from "@/lib/quietHours";

function normalizeLanguage(input: unknown): Language | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  const base = trimmed.split(/[-_]/)[0] || "";
  return isSupportedLanguage(base) ? (base as Language) : null;
}

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get("authorization") || "";
  const cronSecret = req.headers.get("x-cron-secret") ?? "";

  const okByBearer = bearer.startsWith("Bearer ")
    ? bearer.slice(7) === (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "") ||
      bearer.slice(7) === (process.env.CRON_SECRET ?? "")
    : false;
  const okBySecret =
    !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

  return okByBearer || okBySecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const onlyUserId = (req.nextUrl.searchParams.get("userId") || "").trim();
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // 1. Get active users with preferences
  const selectWithLocale =
    "user_id, locale, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone";
  const selectNoLocale =
    "user_id, engagement_frequency, push_enabled, email_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone";

  const firstBase = supabase
    .from("notification_preferences")
    .select(selectWithLocale)
    .neq("engagement_frequency", "disabled")
    .or("push_enabled.eq.true,email_enabled.eq.true");

  const first = onlyUserId ? await firstBase.eq("user_id", onlyUserId) : await firstBase;

  let prefs: any = first.data;
  let prefsErr: any = first.error;

  const errMsg = String((prefsErr as any)?.message || "");
  const errCode = String((prefsErr as any)?.code || "");
  const missingLocaleColumn =
    (errCode === "42703" || errMsg.toLowerCase().includes("does not exist")) &&
    errMsg.toLowerCase().includes("locale");

  if (prefsErr && missingLocaleColumn) {
    const secondBase = supabase
      .from("notification_preferences")
      .select(selectNoLocale)
      .neq("engagement_frequency", "disabled")
      .or("push_enabled.eq.true,email_enabled.eq.true");

    const second = onlyUserId ? await secondBase.eq("user_id", onlyUserId) : await secondBase;
    prefs = second.data;
    prefsErr = second.error;
  }

  if (prefsErr) {
    console.error("daily: preferences error", prefsErr);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }

  let sentCount = 0;
  let skippedCount = 0;

  for (const p of prefs || []) {
    const userId = p.user_id;
    const frequency = p.engagement_frequency; // gentle, aggressive, relentless

    const preferredLocaleRaw = (p as any).locale;

    // 2. Check last activity (transaction)
    const { data: lastTx } = await supabase
      .from("transactions")
      .select("created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastTxDate = lastTx ? new Date(lastTx.created_at) : null;
    const daysSinceLastTx = lastTxDate
      ? Math.floor((today.getTime() - lastTxDate.getTime()) / (1000 * 60 * 60 * 24))
      : 30; // Treat no tx as long inactive

    // 3. Determine Category & Variant
    let category: NotificationCategory = "daily_reminder";
    let variant: NotificationVariant | undefined;

    // Logic based on frequency and activity
    if (daysSinceLastTx >= 7) {
      category = "retention";
      variant = Math.random() > 0.5 ? "insight_based" : "goal_focused";
    } else if (daysSinceLastTx >= 2) {
      category = "retention";
      variant = "friendly";
    } else if (frequency === "aggressive" || frequency === "relentless") {
      category = "aggressive";
      // Pick random aggressive variant or specific logic
      // Random is handled by getNotificationMessage if variant is undefined, 
      // but let's try to be smart or just let it pick random.
    } else {
      // Gentle / Standard
      category = "daily_reminder";
      if (daysSinceLastTx === 0) {
        // Already active today? Maybe "action_oriented" or "professional"
        // Or if it's evening, "casual"
        variant = "casual";
      } else {
        variant = "standard";
      }
    }

    // 4. Rate Limiting (Don't spam "gentle" users)
    // Check if we already queued something for this user today (except strictly necessary alerts)
    // For "relentless", maybe we don't skip? But for now let's limit to 1 daily prompt per cron run.
    const targetCount =
      frequency === "aggressive"
        ? 5
        : frequency === "gentle"
          ? Math.random() < 0.5
            ? 1
            : 2
          : frequency === "relentless"
            ? 5
            : 1;

    const { count } = await supabase
      .from("notification_queue")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", todayStr) // created today
      .eq("notification_type", "reminder")
      .contains("data", { source: "daily" });

    const existingCount = Number(count || 0);
    const remaining = Math.max(0, targetCount - existingCount);
    if (remaining <= 0) {
      skippedCount++;
      continue;
    }

    // Title? 
    // We can map category to a generic title or add titles to NOTIFICATION_STRINGS later.
    // For now, let's use a mapping here.
    const titleMap: Record<string, any> = {
      en: {
        daily_reminder: "Daily Check-in",
        aggressive: "Budget Update",
        retention: "We Miss You",
        budget_alert: "Budget Alert"
      },
      ru: {
        daily_reminder: "Ежедневная проверка",
        aggressive: "Обновление бюджета",
        retention: "Мы скучаем",
        budget_alert: "Уведомление о бюджете"
      },
      uk: {
        daily_reminder: "Щоденна перевірка",
        aggressive: "Оновлення бюджету",
        retention: "Ми сумуємо",
        budget_alert: "Бюджетне сповіщення",
      },
      hi: {
        daily_reminder: "दैनिक चेक-इन",
        aggressive: "बजट अपडेट",
        retention: "हम आपको याद कर रहे हैं",
        budget_alert: "बजट अलर्ट",
      },
      id: {
        daily_reminder: "Cek Harian",
        aggressive: "Pembaruan Anggaran",
        retention: "Kami Merindukanmu",
        budget_alert: "Peringatan Anggaran",
      },
      ja: {
        daily_reminder: "毎日のチェック",
        aggressive: "予算アップデート",
        retention: "お久しぶりです",
        budget_alert: "予算アラート",
      },
      ko: {
        daily_reminder: "일일 체크인",
        aggressive: "예산 업데이트",
        retention: "그리웠어요",
        budget_alert: "예산 알림",
      },
      // Fallback for others to English map or basic
    };

    // 5. Generate Content
    const preferredLocale = normalizeLanguage(preferredLocaleRaw);
    const locale = preferredLocale ?? (await getUserPreferredLanguage(userId));

    const langMap = titleMap[locale] || titleMap["en"];
    const title = langMap[category] || "Spendly";
    
    // 6. Enqueue
    // Calculate scheduled time (respect quiet hours - handled by queue/route usually, but here we insert directly)
    // We'll trust the processor or just set 'now' and let the user settings quiet hours (if implemented in processor) handle it.
    // Actually, `queue/route.ts` calculates `scheduled_for` respecting quiet hours. 
    // We should duplicate that logic or just insert scheduled_for = now and hope processor respects it? 
    // The current processor checks `lte("scheduled_for", nowIso)`. 
    // Let's reuse the quiet hours calculation logic if we can, or just simplify for this MVP.
    // Since this is a cron job running presumably at a good time (or hourly), 
    // we might want to respect the user's quiet hours stored in `p`.

    const scheduledFor = computeNextAllowedTime(new Date(), p).toISOString();

    for (let i = 0; i < remaining; i++) {
      const message = getNotificationMessage(category, locale, {}, variant);

      const { error: insertErr } = await supabase
        .from("notification_queue")
        .insert({
          user_id: userId,
          notification_type: "reminder",
          title,
          message,
          scheduled_for: scheduledFor,
          status: "pending",
          send_push: p.push_enabled,
          send_email: p.email_enabled, // or false if we only want push for these
          attempts: 0,
          data: {
            source: "daily",
            category,
            variant,
          },
        });

      if (!insertErr) {
        sentCount++;
      } else {
        console.error("daily: insert error", insertErr);
      }
    }
  }

  return NextResponse.json({ sent: sentCount, skipped: skippedCount });
}

export async function GET(req: NextRequest) {
  return POST(req);
}
