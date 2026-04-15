import { NextResponse } from "next/server";
import { generateRecurringTransactions } from "@/lib/generateRecurringTransactions";

/**
 * Cron job endpoint to process recurring transactions
 * Processes all active recurring_rules that are due
 * 
 * Configure in vercel.json or your deployment platform:
 * - Schedule: Every hour (0 * * * *)
 * - Timeout: 60 seconds
 */
export async function GET(request: Request) {
  try {
    // Verify cron secret to prevent unauthorized access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret) {
      console.warn("[Cron/Recurring] CRON_SECRET is not set — endpoint is unprotected. Set CRON_SECRET in environment variables.");
    }

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Cron/Recurring] Unauthorized request. Expected Bearer <CRON_SECRET>.");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron/Recurring] Starting recurring transactions processing...");
    const startTime = Date.now();

    // Process all users' recurring rules (no userId filter)
    const result = await generateRecurringTransactions();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron/Recurring] Completed in ${duration}ms. Generated: ${result.generated}, Skipped: ${result.skipped}, Push queued: ${result.pushQueued}, Errors: ${result.errors.length}`
    );
    if (result.errors.length > 0) {
      console.error("[Cron/Recurring] Errors during processing:", result.errors);
    }

    return NextResponse.json({
      success: true,
      generated: result.generated,
      skipped: result.skipped,
      pushQueued: result.pushQueued,
      errors: result.errors,
      duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Error processing recurring transactions:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Disable static optimization for this route
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds timeout
