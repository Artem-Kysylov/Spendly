import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";

type Plan = "monthly" | "yearly" | "lifetime";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const plan = body?.plan as Plan | undefined;
    const localeFromBody = typeof body?.locale === "string" ? body.locale : undefined;

    const { user, locale } = await getAuthenticatedClient(req);

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = Number(process.env.LEMON_SQUEEZY_STORE_ID);

    const fallbackVariantId = Number(process.env.LEMON_SQUEEZY_PRO_VARIANT_ID);
    const monthlyVariantId = Number(process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID);
    const yearlyVariantId = Number(process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID);
    const lifetimeVariantId = Number(process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID);

    const resolvedVariantId =
      plan === "monthly" && Number.isFinite(monthlyVariantId) && monthlyVariantId > 0
        ? monthlyVariantId
        : plan === "yearly" && Number.isFinite(yearlyVariantId) && yearlyVariantId > 0
          ? yearlyVariantId
          : plan === "lifetime" && Number.isFinite(lifetimeVariantId) && lifetimeVariantId > 0
            ? lifetimeVariantId
            : fallbackVariantId;

    if (!apiKey || !storeId || !resolvedVariantId) {
      return NextResponse.json(
        { error: "Missing Lemon Squeezy env" },
        { status: 500 },
      );
    }

    // Строим redirect на страницу успеха с учётом origin и locale
    const origin = new URL(req.url).origin;
    const redirectLocale = localeFromBody || locale;
    const redirectUrl = `${origin}/${redirectLocale}/checkout/success`;

    const previewEnv = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PREVIEW_MODE;
    const preview =
      typeof previewEnv === "undefined"
        ? true
        : previewEnv === "true" || previewEnv === "1";

    const payload = {
      data: {
        type: "checkouts",
        attributes: {
          checkout_data: {
            custom: {
              user_id: user.id,
            },
          },
          preview,
          redirect_url: redirectUrl,
        },
        relationships: {
          store: {
            data: {
              type: "stores",
              id: String(storeId),
            },
          },
          variant: {
            data: {
              type: "variants",
              id: String(resolvedVariantId),
            },
          },
        },
      },
    };
    console.log("[Checkout API] request payload:", payload);

    let res: Response;
    try {
      res = await fetch("https://api.lemonsqueezy.com/v1/checkouts", {
        method: "POST",
        headers: {
          Accept: "application/vnd.api+json",
          "Content-Type": "application/vnd.api+json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
    } catch (error: any) {
      console.error("[Checkout Error Details]:", error.response?.data || error.message || error);
      return NextResponse.json(
        { error: "Checkout API request failed", details: error.message },
        { status: 500 },
      );
    }

    if (!res.ok) {
      const text = await res.text();
      console.error("[Checkout API Error Response]:", {
        status: res.status,
        statusText: res.statusText,
        body: text,
      });
      return NextResponse.json(
        { error: "Checkout API failed", details: text },
        { status: 500 },
      );
    }

    const json = await res.json();
    const url = json?.data?.attributes?.url;
    console.log("[Checkout API] response URL:", url);

    if (!url) {
      return NextResponse.json(
        { error: "No URL in response" },
        { status: 500 },
      );
    }

    const urlWithCustomData = (() => {
      try {
        const u = new URL(url);
        u.searchParams.set("checkout[custom][user_id]", user.id);
        return u.toString();
      } catch {
        return url;
      }
    })();

    return NextResponse.json({ url: urlWithCustomData }, { status: 200 });
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
