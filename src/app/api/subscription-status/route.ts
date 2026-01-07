import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedClient, getServerSupabaseClient } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(req);
    const admin = getServerSupabaseClient();

    const { data, error } = await admin
      .from("users")
      .select("is_pro")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch subscription status" },
        { status: 500 },
      );
    }

    const isPro = (data as any)?.is_pro === true;

    return NextResponse.json(
      {
        is_pro: isPro,
        subscription_status: isPro ? "pro" : "free",
      },
      { status: 200 },
    );
  } catch (err: any) {
    const message = typeof err?.message === "string" ? err.message : "";
    if (
      message === "Missing or invalid authorization header" ||
      message === "Invalid or expired token"
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json(
      { error: "Unexpected error", details: err?.message },
      { status: 500 },
    );
  }
}
