import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";

export async function POST(request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json("Missing webhook secret", { status: 400 });
  }

  const rawBody = await request.text();
  const signatureHex = request.headers.get("X-Signature") ?? "";
  if (!signatureHex || !rawBody) {
    return NextResponse.json("Invalid request", { status: 400 });
  }

  // Сравниваем HMAC(digest) и заголовок X-Signature, оба в hex
  const hmacHex = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const hmac = Buffer.from(hmacHex, "hex");
  const signature = Buffer.from(signatureHex, "hex");

  if (
    hmac.length !== signature.length ||
    !crypto.timingSafeEqual(hmac, signature)
  ) {
    return NextResponse.json("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload?.meta?.event_name ?? "unknown";
  console.log("[Lemon Squeezy webhook]", eventName, payload?.data?.attributes);

  // Тут можно включать/отключать Pro-статус:
  // subscription_payment_success -> активировать
  // subscription_cancelled/expired -> деактивировать

  const userId =
    typeof payload?.meta?.custom_data?.user_id === "string"
      ? payload.meta.custom_data.user_id
      : null;

  const customerId = (() => {
    const id =
      payload?.data?.attributes?.customer_id ??
      payload?.data?.relationships?.customer?.data?.id;
    if (typeof id === "string" && id.length > 0) return id;
    if (typeof id === "number" && Number.isFinite(id)) return String(id);
    return null;
  })();

  const isPro =
    eventName === "subscription_payment_success" ||
    eventName === "subscription_created" ||
    eventName === "order_created";

  const shouldSetFree =
    eventName === "subscription_cancelled" ||
    eventName === "subscription_expired" ||
    eventName === "order_refunded";

  const shouldUpdate = isPro || shouldSetFree;
  if (shouldUpdate && userId) {
    const supabase = getServerSupabaseClient();
    const updatePayload: Record<string, any> = {
      is_pro: isPro,
      subscription_status: isPro ? "pro" : "free",
    };
    if (customerId) updatePayload.lemon_squeezy_customer_id = customerId;

    const updateRes = await supabase
      .from("users")
      .update(updatePayload)
      .eq("id", userId)
      .select("id");

    if (!updateRes.error && Array.isArray(updateRes.data) && updateRes.data.length === 0) {
      await supabase
        .from("users")
        .upsert([{ id: userId, ...updatePayload }], { onConflict: "id" });
    }
  }

  return NextResponse.json("OK", { status: 200 });
}
