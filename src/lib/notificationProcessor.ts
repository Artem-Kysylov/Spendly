import webpush from "web-push";
import { SupabaseClient } from "@supabase/supabase-js";

function backoffDelayMs(attempts: number) {
  // 1m, 2m, 4m ...
  const base = 60_000;
  const pow = Math.max(0, attempts - 1);
  return base * Math.pow(2, pow);
}

export async function processNotificationQueue(supabase: SupabaseClient) {
  const nowIso = new Date().toISOString();

  const vapidPublic = (
    process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
  ).trim();
  const vapidPrivate = (process.env.VAPID_PRIVATE_KEY ?? "").trim();

  console.log(
    "webpush: VAPID_PRIVATE_KEY prefix:",
    vapidPrivate ? vapidPrivate.slice(0, 4) : "(missing)",
  );

  if (!vapidPublic || !vapidPrivate) {
    console.error("Missing VAPID keys");
    return { error: "Missing VAPID keys" };
  }

  webpush.setVapidDetails(
    "mailto:admin@example.com",
    vapidPublic,
    vapidPrivate,
  );

  // Загружаем pending задачи
  const { data: tasks, error: tasksErr } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", nowIso)
    .order("created_at", { ascending: true })
    .limit(20); // Ограничим лимит, чтобы не блокировать процесс слишком надолго

  if (tasksErr) {
    console.error("processor: queue select error", tasksErr);
    return { error: "Failed to fetch queue" };
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  for (const task of tasks || []) {
    const shouldSendPush = (task as any)?.send_push !== false;

    let subs: any[] = [];
    if (shouldSendPush) {
      // Получаем активные подписки пользователя
      const { data: subsData, error: subsErr } = await supabase
        .from("notification_subscriptions")
        .select("id, endpoint, p256dh_key, auth_key, is_active")
        .eq("user_id", task.user_id)
        .eq("is_active", true);

      if (subsErr) {
        console.warn("processor: subs error", subsErr);
      }
      subs = Array.isArray(subsData) ? subsData : [];
    }

    let anySuccess = !shouldSendPush || subs.length === 0;
    const payload = JSON.stringify({
      title: task.title || "Spendly",
      body: task.message || "Notification",
      tag: task.data?.tag || "spendly",
      renotify: !!task.data?.renotify,
      badge: task.data?.badge || "/icons/icon-192x192.png",
      data: {
        deepLink: task.data?.deepLink || "/dashboard",
      },
    });

    if (shouldSendPush) {
      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
            } as any,
            payload,
          );
          anySuccess = true;
        } catch (err: any) {
          const code = Number(err?.statusCode || err?.status || 0);
          const msg = String(err?.body || err?.message || "");
          if ([410, 404, 403].includes(code)) {
            // Деактивируем битую подписку
            await supabase
              .from("notification_subscriptions")
              .update({ is_active: false })
              .eq("id", sub.id);
          }
          // Не ретраим конкретную подписку, переходим к следующей
          console.warn("webpush error", code, msg);
          if (msg.toLowerCase().includes("failed via jose")) {
            console.warn(
              "webpush: possible VAPID mismatch. Ensure VAPID_PRIVATE_KEY matches NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PUBLIC_KEY.",
            );
          }
        }
      }
    }

    const attempts = Number(task.attempts || 0) + 1;
    if (anySuccess) {
      try {
        const { data: existingNotif } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", task.user_id)
          .eq("metadata->>queue_id", String(task.id))
          .limit(1);

        if (!existingNotif || existingNotif.length === 0) {
          const notificationType = task.notification_type || "general";
          const metadata = {
            ...(task.data || {}),
            queue_id: task.id,
          };

          await supabase.from("notifications").insert({
            user_id: task.user_id,
            title: task.title || "Spendly",
            message: task.message || "Notification",
            type: notificationType,
            metadata,
            is_read: false,
          });
        }
      } catch (e) {
        console.warn("processor: failed to sync in-app notifications", e);
      }

      await supabase
        .from("notification_queue")
        .update({ status: "sent", attempts })
        .eq("id", task.id);
      sent++;
    } else {
      if (attempts >= Number(task.max_attempts || 3)) {
        await supabase
          .from("notification_queue")
          .update({ status: "failed", attempts })
          .eq("id", task.id);
        failed++;
      } else {
        const delay = backoffDelayMs(attempts);
        const nextTime = new Date(Date.now() + delay).toISOString();
        await supabase
          .from("notification_queue")
          .update({ status: "pending", attempts, scheduled_for: nextTime })
          .eq("id", task.id);
      }
    }
    processed++;
  }

  return { ok: true, processed, sent, failed };
}
