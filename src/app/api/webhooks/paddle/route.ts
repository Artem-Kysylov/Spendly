import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getServerSupabaseClient } from "@/lib/serverSupabase";
import { sendProSuccessEmail } from "@/lib/brevo";

export const runtime = "nodejs";

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

type PaddleWebhookPayload = {
  event_id?: string;
  event_type?: string;
  occurred_at?: string;
  notification_id?: string;
  data?: any;
};

function parsePaddleSignatureHeader(header: string | null) {
  if (!header) return null;

  const parts = header
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  let ts: string | null = null;
  const h1: string[] = [];

  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!value) continue;

    if (key === "ts") ts = value;
    if (key === "h1") h1.push(value);
  }

  if (!ts || h1.length === 0) return null;
  return { ts, h1 };
}

function isSignatureValid(opts: {
  rawBody: string;
  signatureHeader: string | null;
  secret: string;
}) {
  const { rawBody, signatureHeader, secret } = opts;
  const parsed = parsePaddleSignatureHeader(signatureHeader);
  if (!parsed) return false;

  const tsNum = Number(parsed.ts);
  if (!Number.isFinite(tsNum)) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - tsNum) > TIMESTAMP_TOLERANCE_SECONDS) return false;

  const signedPayload = `${parsed.ts}:${rawBody}`;
  const expectedHex = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  const expected = Buffer.from(expectedHex, "hex");

  for (const candidateHex of parsed.h1) {
    try {
      const candidate = Buffer.from(candidateHex, "hex");
      if (candidate.length !== expected.length) continue;
      if (crypto.timingSafeEqual(candidate, expected)) return true;
    } catch {
      continue;
    }
  }

  return false;
}

function getUserIdFromPaddlePayload(payload: PaddleWebhookPayload) {
  const custom =
    (payload as any)?.data?.custom_data ||
    (payload as any)?.data?.customData ||
    (payload as any)?.custom_data ||
    (payload as any)?.customData;

  const userId = custom?.user_id ?? custom?.userId ?? custom?.uid;
  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

function getCustomerIdFromPaddlePayload(payload: PaddleWebhookPayload) {
  const id =
    (payload as any)?.data?.customer_id ??
    (payload as any)?.data?.customer?.id ??
    (payload as any)?.data?.customer?.customer_id;

  return typeof id === "string" && id.length > 0 ? id : null;
}

function isMissingColumnError(err: any) {
  const message = typeof err?.message === "string" ? err.message : "";
  const code = typeof err?.code === "string" ? err.code : "";
  return code === "42703" || message.toLowerCase().includes("does not exist");
}

function isMissingRelationError(err: any, table: string) {
  const message = typeof err?.message === "string" ? err.message : "";
  const code = typeof err?.code === "string" ? err.code : "";
  return (
    code === "42P01" ||
    message.includes(`relation \"${table}\" does not exist`) ||
    message.includes(`relation \"public.${table}\" does not exist`) ||
    message.includes(`relation \"${table}\" does not exist`)
  );
}

type UpdateResult =
  | { updated: true; table: string; matchedBy: "id" | "user_id"; mode: "update" | "upsert" }
  | { updated: false; table: string; error: any };

async function updateUserInTable(opts: {
  table: string;
  userId: string;
  isPro: boolean;
  customerId?: string | null;
}) {
  const { table, userId, isPro, customerId } = opts;
  const supabase = getServerSupabaseClient();

  const tryUpdate = async (matchCol: "id" | "user_id") => {
    const corePayload: Record<string, any> = {
      is_pro: isPro,
      subscription_status: isPro ? "pro" : "free",
    };

    let updateRes = await supabase
      .from(table)
      .update(corePayload)
      .eq(matchCol, userId)
      .select(matchCol);

    if (updateRes.error && isMissingColumnError(updateRes.error)) {
      updateRes = await supabase
        .from(table)
        .update({ is_pro: isPro })
        .eq(matchCol, userId)
        .select(matchCol);
    }

    if (updateRes.error) return { data: updateRes.data, error: updateRes.error };

    const rows = Array.isArray(updateRes.data) ? updateRes.data : [];
    if (rows.length > 0) {
      if (customerId) {
        const setCustomer = await supabase
          .from(table)
          .update({ paddle_customer_id: customerId })
          .eq(matchCol, userId)
          .select(matchCol);

        if (setCustomer.error && !isMissingColumnError(setCustomer.error)) {
          console.warn(`[Paddle webhook] Failed to set paddle_customer_id on ${table}`, {
            userId,
            error: setCustomer.error?.message,
          });
        }
      }

      return { data: updateRes.data, error: null };
    }

    return { data: updateRes.data, error: null };
  };

  try {
    const byId = await tryUpdate("id");
    if (!byId.error && Array.isArray(byId.data) && byId.data.length > 0) {
      return { updated: true, table, matchedBy: "id", mode: "update" } satisfies UpdateResult;
    }

    if (!byId.error && Array.isArray(byId.data) && byId.data.length === 0) {
      const coreUpsertPayload: Record<string, any> = {
        id: userId,
        is_pro: isPro,
        subscription_status: isPro ? "pro" : "free",
      };

      let upsertRes = await supabase
        .from(table)
        .upsert([coreUpsertPayload], { onConflict: "id" })
        .select("id");

      if (upsertRes.error && isMissingColumnError(upsertRes.error)) {
        upsertRes = await supabase
          .from(table)
          .upsert([{ id: userId, is_pro: isPro }], { onConflict: "id" })
          .select("id");
      }

      if (!upsertRes.error && Array.isArray(upsertRes.data) && upsertRes.data.length > 0) {
        if (customerId) {
          const setCustomer = await supabase
            .from(table)
            .update({ paddle_customer_id: customerId })
            .eq("id", userId)
            .select("id");

          if (setCustomer.error && !isMissingColumnError(setCustomer.error)) {
            console.warn(`[Paddle webhook] Failed to set paddle_customer_id on ${table}`, {
              userId,
              error: setCustomer.error?.message,
            });
          }
        }

        return { updated: true, table, matchedBy: "id", mode: "upsert" } satisfies UpdateResult;
      }

      if (upsertRes.error) {
        if (isMissingRelationError(upsertRes.error, table)) {
          return { updated: false, table, error: upsertRes.error } satisfies UpdateResult;
        }
      }
    }

    const byUserId = await tryUpdate("user_id");
    const byUserIdRow = (byUserId.data as any)?.user_id;
    if (!byUserId.error && typeof byUserIdRow === "string" && byUserIdRow.length > 0) {
      return { updated: true, table, matchedBy: "user_id", mode: "update" } satisfies UpdateResult;
    }

    return { updated: false, table, error: byId.error || byUserId.error || null } satisfies UpdateResult;
  } catch (e: any) {
    return { updated: false, table, error: e } satisfies UpdateResult;
  }
}

async function updateSubscriptionState(opts: {
  userId: string;
  isPro: boolean;
  customerId?: string | null;
}) {
  const { userId, isPro, customerId } = opts;
  const profilesRes = await updateUserInTable({
    table: "profiles",
    userId,
    isPro,
    customerId,
  });

  if (profilesRes.updated && isPro) {
    const supabase = getServerSupabaseClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (profile) {
      const firstName = profile.first_name || "Friend";
      try {
        await sendProSuccessEmail(profile.email, firstName);
        console.log("[Paddle webhook] Pro success email sent to", profile.email);
      } catch (emailError) {
        console.warn("[Paddle webhook] Failed to send Pro email:", emailError);
      }
    }
  }

  return { anyUpdated: profilesRes.updated, results: [profilesRes] };
}

export async function POST(request: NextRequest) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Missing PADDLE_WEBHOOK_SECRET" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signatureHeader =
    request.headers.get("Paddle-Signature") || request.headers.get("paddle-signature");

  const ok = isSignatureValid({ rawBody, signatureHeader, secret });
  if (!ok) {
    console.warn("[Paddle webhook] Invalid signature", {
      hasSignatureHeader: typeof signatureHeader === "string" && signatureHeader.length > 0,
      bodyLength: rawBody.length,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: PaddleWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as PaddleWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload?.event_type;
  if (typeof eventType !== "string" || eventType.length === 0) {
    return NextResponse.json({ error: "Missing event_type" }, { status: 400 });
  }

  const userId = getUserIdFromPaddlePayload(payload);
  const customerId = getCustomerIdFromPaddlePayload(payload);

  if (
    eventType === "transaction.completed" ||
    eventType === "subscription.updated" ||
    eventType === "subscription.canceled"
  ) {
    if (!userId) {
      return NextResponse.json(
        { error: "Missing data.custom_data.user_id" },
        { status: 400 },
      );
    }

    const isPro = eventType !== "subscription.canceled";

    const { anyUpdated, results } = await updateSubscriptionState({
      userId,
      isPro,
      customerId,
    });

    if (!anyUpdated) {
      console.error("[Paddle webhook] Failed to update subscription state", {
        eventType,
        userId,
        customerId,
        results: results.map((r) => ({
          table: r.table,
          updated: r.updated,
          error: (r as any)?.error?.message,
        })),
      });
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log("[Paddle webhook] subscription state updated", {
      eventType,
      userId,
      isPro,
      customerId,
      results: results
        .filter((r) => r.updated)
        .map((r) => ({ table: r.table, matchedBy: r.matchedBy, mode: r.mode })),
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
