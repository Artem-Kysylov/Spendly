import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { processNotificationQueue } from "@/lib/notificationProcessor";

function isAuthorized(req: NextRequest): boolean {
  const bearer = req.headers.get("authorization") || "";
  const cronSecret = req.headers.get("x-cron-secret") ?? "";
  const okByBearer = bearer.startsWith("Bearer ")
    ? bearer.slice(7) === (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "")
    : false;

  const okBySecret =
    !!process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;

  return okByBearer || okBySecret;
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const user_id: unknown = body?.user_id;

    if (typeof user_id !== "string" || user_id.trim().length === 0) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    const supabase = getServerSupabaseClient();

    const { data: queued, error: insertErr } = await supabase
      .from("notification_queue")
      .insert({
        user_id,
        notification_type: "internal_test",
        title: "Test Push",
        message: "Test push from /api/test-push",
        data: { deepLink: "/dashboard", tag: "spendly-test" },
        send_push: true,
        send_email: false,
        scheduled_for: nowIso,
        status: "pending",
        attempts: 0,
        max_attempts: 1,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json(
        {
          error: "Failed to enqueue test notification",
          details:
            process.env.NODE_ENV !== "production"
              ? {
                  code: (insertErr as any).code,
                  message: (insertErr as any).message,
                  details: (insertErr as any).details,
                  hint: (insertErr as any).hint,
                }
              : undefined,
        },
        { status: 500 },
      );
    }

    const result = await processNotificationQueue(supabase);
    if ((result as any)?.error) {
      return NextResponse.json(
        { queued, error: (result as any).error, processor: result },
        { status: 500 },
      );
    }

    return NextResponse.json({ queued, processor: result });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
