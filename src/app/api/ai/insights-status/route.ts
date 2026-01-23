import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedClient, getServerSupabaseClient } from "@/lib/serverSupabase";

export const runtime = "nodejs";

type InsightsStatusResponse = {
  is_pro: boolean;
  insight_count: number;
};

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(req);
    const admin = getServerSupabaseClient();

    const { data: userRow, error: userErr } = await admin
      .from("users")
      .select("is_pro")
      .eq("id", user.id)
      .maybeSingle();

    if (userErr) {
      return NextResponse.json(
        { error: "Failed to fetch subscription status" },
        { status: 500 },
      );
    }

    const isPro = (userRow as { is_pro?: unknown } | null)?.is_pro === true;

    const { count, error: countErr } = await admin
      .from("ai_usage_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("request_type", "insight");

    if (countErr) {
      return NextResponse.json(
        { error: "Failed to fetch insight usage" },
        { status: 500 },
      );
    }

    const response: InsightsStatusResponse = {
      is_pro: isPro,
      insight_count: count ?? 0,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message?: unknown }).message ?? "")
        : "";

    if (
      message === "Missing or invalid authorization header" ||
      message === "Invalid or expired token"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
