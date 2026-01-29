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

    if (!customerId.startsWith("ctm_")) {
      console.warn("[CustomerPortal] paddle_customer_id does not look like a ctm_ id", {
        userId: user.id,
        customerId,
      });
    }

    const apiKey = (process.env.PADDLE_API_KEY || process.env.PADDLE_API_SECRET || "").trim();
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing PADDLE_API_KEY" },
        { status: 500 },
      );
    }

    const sellerId = (process.env.PADDLE_SELLER_ID || "").trim();
    if (!sellerId) {
      return NextResponse.json(
        { error: "Missing PADDLE_SELLER_ID" },
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

    const normalizedEnv =
      env === "production" || env === "live" || env === "prod"
        ? "production"
        : env === "sandbox" || env === "test"
          ? "sandbox"
          : "";

    const baseUrl = normalizedEnv === "sandbox" ? "https://sandbox-api.paddle.com" : "https://api.paddle.com";

    let res: Response;
    let text = "";
    try {
      res = await fetch(
        `${baseUrl}/customers/${encodeURIComponent(customerId)}/portal-sessions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Paddle-Version": "1",
            "Paddle-Seller-Id": sellerId,
          },
          body: JSON.stringify({}),
        },
      );
      text = await res.text().catch(() => "");
    } catch (e) {
      console.error("[CustomerPortal] Paddle request failed", {
        userId: user.id,
        customerId,
        env: normalizedEnv || env || "(unknown)",
        error: e,
      });
      return NextResponse.json(
        { error: "Failed to create portal session" },
        { status: 502 },
      );
    }

    if (!res.ok) {
      console.error("[CustomerPortal] Paddle error response", {
        userId: user.id,
        customerId,
        env: normalizedEnv || env || "(unknown)",
        status: res.status,
        body: text,
      });
      return NextResponse.json(
        { error: "Failed to create portal session", details: text },
        { status: 502 },
      );
    }

    const json = (text ? (JSON.parse(text) as PaddlePortalResponse) : null) as PaddlePortalResponse | null;
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

    console.error("[CustomerPortal] Unexpected error", err);

    return NextResponse.json(
      { error: "Unexpected error", details: err?.message },
      { status: 500 },
    );
  }
}
