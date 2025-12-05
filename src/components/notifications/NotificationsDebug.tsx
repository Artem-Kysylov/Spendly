"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { supabase } from "@/lib/supabaseClient";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData =
    typeof window !== "undefined"
      ? window.atob(base64)
      : Buffer.from(base64, "base64").toString("binary");
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i)
    outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export default function NotificationsDebug() {
  const locale = useLocale();
  const [log, setLog] = useState<string>("");

  const append = (msg: string) => setLog((prev) => `${prev}\n${msg}`);

  const requestPermission = async () => {
    try {
      const res = await Notification.requestPermission();
      append(`Permission: ${res}`);
    } catch (e: any) {
      append(`Permission error: ${e?.message || String(e)}`);
    }
  };

  const subscribePush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapid) return append("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY");
      const applicationServerKey = urlBase64ToUint8Array(vapid);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      append("Push subscription created");

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return append("No user access token");

      const res = await fetch(`/${locale}/api/notifications/subscribe`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription }),
      });
      const json = await res.json();
      append(`Subscribe API: ${res.status} ${JSON.stringify(json)}`);
    } catch (e: any) {
      append(`Subscribe error: ${e?.message || String(e)}`);
    }
  };

  const sendQueueItem = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return append("No user access token");

      const res = await fetch(`/${locale}/api/notifications/queue`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          notification_type: "reminder",
          title: "Test",
          message: "Hello from NotificationsDebug",
          send_push: true,
        }),
      });
      const json = await res.json();
      append(`Queue API: ${res.status} ${JSON.stringify(json)}`);
    } catch (e: any) {
      append(`Queue error: ${e?.message || String(e)}`);
    }
  };

  const devtoolsPushHint = () => {
    append(
      "Если DevTools Push ничего не делает, убедитесь, что Notification.permission = granted и push-обработчик SW действительно срабатывает. Предупреждение Workbox InjectManifest в dev — ожидаемое.",
    );
  };

  return (
    <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
      <strong>Notifications Debug</strong>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button onClick={requestPermission} style={{ padding: "6px 10px" }}>
          Request permission
        </button>
        <button onClick={subscribePush} style={{ padding: "6px 10px" }}>
          Subscribe to push
        </button>
        <button onClick={sendQueueItem} style={{ padding: "6px 10px" }}>
          Send test queue item
        </button>
        <button onClick={devtoolsPushHint} style={{ padding: "6px 10px" }}>
          Show hints
        </button>
      </div>
      <pre
        style={{
          marginTop: 12,
          maxHeight: 240,
          overflow: "auto",
          background: "#f7f7f7",
          padding: 10,
        }}
      >
        {log || "No logs yet"}
      </pre>
    </div>
  );
}
