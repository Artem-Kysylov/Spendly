import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedClient, getServerSupabaseClient } from "@/lib/serverSupabase";

export const runtime = "nodejs";

type PaddlePortalResponse = {
  data?: {
    urls?: {
      general?: {
        overview?: string;
      };
    };
  };
};

export async function POST(req: NextRequest) {
  try {
    const { user } = await getAuthenticatedClient(req);
    const admin = getServerSupabaseClient();

    const { data: profile, error } = await admin
      .from("profiles")
      .select("is_pro, paddle_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "Failed to load profile" },
        { status: 500 },
      );
    }

    const isPro = (profile as any)?.is_pro === true;
    const customerId = (profile as any)?.paddle_customer_id;

    if (!isPro) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (typeof customerId !== "string" || customerId.length === 0) {
      return NextResponse.json({ error: "Missing paddle_customer_id" }, { status: 400 });
    }

    const apiKey = (process.env.PADDLE_API_KEY || process.env.PADDLE_API_SECRET || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing PADDLE_API_KEY" },
        { status: 500 },
      );
    }

    const env = (
      process.env.PADDLE_ENVIRONMENT ||
      process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT ||
      ""
    )
      .trim()
      .toLowerCase();

    const baseUrl = env === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

    const res = await fetch(`${baseUrl}/customers/${encodeURIComponent(customerId)}/portal-sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Paddle-Version": "1",
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to create portal session", details: text },
        { status: 502 },
      );
    }

    const json = (await res.json().catch(() => null)) as PaddlePortalResponse | null;
    const url = json?.data?.urls?.general?.overview;

    if (typeof url !== "string" || url.length === 0) {
      return NextResponse.json(
        { error: "Missing portal URL" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url }, { status: 200 });
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
