import { NextResponse } from "next/server";
import { processRecurringTransactions } from "@/lib/processRecurringTransactions";

/**
 * Cron job endpoint to process recurring transactions
 * Should be called hourly to check for users at 9am local time
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

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("[Cron] Starting recurring transactions processing...");
    const startTime = Date.now();

    const result = await processRecurringTransactions();

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Completed in ${duration}ms. Processed: ${result.processed}, Failed: ${result.failed}`
    );

    return NextResponse.json({
      success: true,
      processed: result.processed,
      failed: result.failed,
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
