import { NextRequest, NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";

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

async function callDailyGenerator(req: NextRequest, userId: string) {
  const url = new URL(`/en/api/notifications/daily?userId=${encodeURIComponent(userId)}`, req.nextUrl.origin);
  const authorization = req.headers.get("authorization");
  const cronSecret = req.headers.get("x-cron-secret");
  const fallbackAuthorization = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : null;
  const injectedAuthorization = authorization ?? fallbackAuthorization;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...(injectedAuthorization ? { authorization: injectedAuthorization } : {}),
      ...(cronSecret ? { "x-cron-secret": cronSecret } : {}),
    },
    cache: "no-store",
  });

  const body = await res.text();
  return { status: res.status, body };
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (req.nextUrl.searchParams.get("userId") || "").trim();
  if (!userId) {
    return NextResponse.json(
      { error: "Missing userId" },
      { status: 400 },
    );
  }

  const supabase = getServerSupabaseClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { error: delErr } = await supabase
    .from("notification_queue")
    .delete()
    .eq("user_id", userId)
    .gte("created_at", todayStr)
    .eq("notification_type", "reminder")
    .contains("data", { source: "daily" });

  if (delErr) {
    return NextResponse.json(
      { error: "Failed to clear queue", details: delErr },
      { status: 500 },
    );
  }

  const regen = await callDailyGenerator(req, userId);

  return NextResponse.json({ cleared: true, regen });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
