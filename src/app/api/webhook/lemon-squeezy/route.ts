import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";

export const runtime = "nodejs";

type LemonEventName =
  | "order_created"
  | "subscription_created"
  | "subscription_cancelled"
  | "order_refunded";

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (typeof value === "undefined") return fallback;
  return value === "true" || value === "1";
}

function verifyLemonSignature(opts: {
  rawBody: string;
  signatureHex: string;
  secret: string;
}) {
  const { rawBody, signatureHex, secret } = opts;

  if (!signatureHex) return false;

  try {
    const hmacHex = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");

    const hmac = Buffer.from(hmacHex, "hex");
    const signature = Buffer.from(signatureHex, "hex");

    if (hmac.length !== signature.length) return false;
    return crypto.timingSafeEqual(hmac, signature);
  } catch {
    return false;
  }
}

function getUserIdFromPayload(payload: any) {
  const custom = payload?.meta?.custom_data;
  const userId = custom?.user_id || custom?.userId || custom?.uid;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function getCustomerIdFromPayload(payload: any) {
  const id =
    payload?.data?.attributes?.customer_id ??
    payload?.data?.relationships?.customer?.data?.id;

  if (typeof id === "string" && id.length > 0) return id;
  if (typeof id === "number" && Number.isFinite(id)) return String(id);
  return null;
}

function getVariantIdFromPayload(payload: any) {
  const id =
    payload?.data?.attributes?.variant_id ??
    payload?.data?.attributes?.first_order_item?.variant_id ??
    payload?.data?.relationships?.variant?.data?.id;

  if (typeof id === "number" && Number.isFinite(id)) return id;
  if (typeof id === "string" && id.trim().length > 0) {
    const n = Number(id);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getPlanFromVariantId(variantId: number | null) {
  const monthly = Number(process.env.LEMON_SQUEEZY_MONTHLY_VARIANT_ID);
  const yearly = Number(process.env.LEMON_SQUEEZY_YEARLY_VARIANT_ID);
  const lifetime = Number(process.env.LEMON_SQUEEZY_LIFETIME_VARIANT_ID);

  if (variantId && Number.isFinite(monthly) && variantId === monthly)
    return "monthly";
  if (variantId && Number.isFinite(yearly) && variantId === yearly) return "yearly";
  if (variantId && Number.isFinite(lifetime) && variantId === lifetime)
    return "lifetime";
  return "unknown";
}

type UpdateProfilesResult =
  | { updated: true; matchedBy: "id" | "user_id" }
  | { updated: false; matchedBy: null; error: any };

async function updateProfilesByUserId(opts: {
  userId: string;
  isPro: boolean;
  customerId?: string | null;
}): Promise<UpdateProfilesResult> {
  const { userId, isPro, customerId } = opts;
  const supabase = getServerSupabaseClient();

  const updatePayload: Record<string, any> = {
    is_pro: isPro,
    subscription_status: isPro ? "pro" : "free",
  };

  if (customerId) {
    updatePayload.lemon_squeezy_customer_id = customerId;
  }

  // Primary guess: profiles.id == auth.users.id
  const { data: updatedById, error: errById } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", userId)
    .select("id")
    .maybeSingle();

  if (!errById && updatedById?.id) {
    return { updated: true, matchedBy: "id" };
  }

  // Fallback: some schemas use profiles.user_id
  const { data: updatedByUserId, error: errByUserId } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", userId)
    .select("user_id")
    .maybeSingle();

  if (!errByUserId && (updatedByUserId as any)?.user_id) {
    return { updated: true, matchedBy: "user_id" };
  }

  return {
    updated: false,
    matchedBy: null,
    error: errById || errByUserId || null,
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing webhook secret" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHex =
    request.headers.get("X-Signature") || request.headers.get("x-signature") || "";

  const signatureOk = verifyLemonSignature({ rawBody, signatureHex, secret });
  if (!signatureOk) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventName = payload?.meta?.event_name as LemonEventName | undefined;
  if (!eventName) {
    return NextResponse.json({ error: "Missing event" }, { status: 400 });
  }

  const userId = getUserIdFromPayload(payload);
  const customerId = getCustomerIdFromPayload(payload);
  const variantId = getVariantIdFromPayload(payload);
  const plan = getPlanFromVariantId(variantId);

  const logVerbose = parseBooleanEnv(process.env.LEMON_SQUEEZY_WEBHOOK_VERBOSE_LOGS, false);
  console.log("[LS webhook] event=", eventName, "plan=", plan, "variant=", variantId);
  if (logVerbose) {
    console.log("[LS webhook] userId=", userId, "customerId=", customerId);
  }

  if (
    eventName === "order_created" ||
    eventName === "subscription_created" ||
    eventName === "subscription_cancelled" ||
    eventName === "order_refunded"
  ) {
    if (!userId) {
      return NextResponse.json(
        { error: "Missing meta.custom_data.user_id" },
        { status: 400 },
      );
    }

    const isPro = eventName === "order_created" || eventName === "subscription_created";

    const result = await updateProfilesByUserId({
      userId,
      isPro,
      customerId,
    });

    if (!result.updated) {
      console.error("[LS webhook] Failed to update profiles", {
        eventName,
        userId,
        plan,
        variantId,
        error: result.error?.message,
      });
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log("[LS webhook] profiles updated", {
      eventName,
      userId,
      isPro,
      plan,
      variantId,
      matchedBy: result.matchedBy,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
