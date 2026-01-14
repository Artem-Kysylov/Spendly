import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient, getServerSupabaseClient } from "@/lib/serverSupabase";
import { processNotificationQueue } from "@/lib/notificationProcessor";

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(req);

    const nowIso = new Date().toISOString();
    const adminSupabase = getServerSupabaseClient();

    const { data: existingTypes, error: typesErr } = await adminSupabase
      .from("notification_queue")
      .select("notification_type")
      .not("notification_type", "is", null)
      .limit(20);

    if (typesErr) {
      console.error("Test push: failed to read notification_type enum sample", typesErr);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to resolve notification_type enum value",
          details: {
            code: (typesErr as any).code,
            message: (typesErr as any).message,
          },
        },
        { status: 500 },
      );
    }

    const resolvedType =
      (existingTypes || [])
        .map((r: any) => String(r?.notification_type || "").trim())
        .find((v: string) => v.length > 0) || null;

    if (!resolvedType) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No existing notification_type values found in notification_queue. Cannot enqueue test notification without knowing enum values.",
        },
        { status: 500 },
      );
    }

    // 1. Enqueue test notification
    const { data: queued, error: insertErr } = await adminSupabase
      .from("notification_queue")
      .insert({
        user_id: user.id,
        notification_type: resolvedType,
        title: "Test Push",
        message: "Test push successful! 🎉",
        data: { deepLink: "/dashboard", tag: "spendly-test-manual" },
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
      console.error("Test push enqueue error:", insertErr);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to enqueue test notification",
          details: {
            code: (insertErr as any).code,
            message: (insertErr as any).message,
          },
        },
        { status: 500 },
      );
    }

    // 2. Immediately process the queue
    const processorResult = await processNotificationQueue(adminSupabase);

    // 3. Check if there was an error
    if ((processorResult as any)?.error) {
      return NextResponse.json(
        {
          success: false,
          queued,
          processor: processorResult,
          error: (processorResult as any).error,
        },
        { status: 500 },
      );
    }

    // 4. Return success with details
    return NextResponse.json({
      success: true,
      queued,
      processor: processorResult,
      message:
        processorResult.sent && processorResult.sent > 0
          ? "Push notification sent! Check your device."
          : "Notification queued but no active subscriptions found or sending failed.",
    });
  } catch (error) {
    console.error("Test push API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: error instanceof Error && error.message.includes("authorization") ? 401 : 500 },
    );
  }
}
