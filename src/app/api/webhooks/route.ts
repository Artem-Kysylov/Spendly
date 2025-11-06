import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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
  const hmacHex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const hmac = Buffer.from(hmacHex, "hex");
  const signature = Buffer.from(signatureHex, "hex");

  if (hmac.length !== signature.length || !crypto.timingSafeEqual(hmac, signature)) {
    return NextResponse.json("Invalid signature", { status: 400 });
  }

  const payload = JSON.parse(rawBody);
  const eventName = payload?.meta?.event_name ?? "unknown";
  console.log("[Lemon Squeezy webhook]", eventName, payload?.data?.attributes);

  // Тут можно включать/отключать Pro-статус: 
  // subscription_payment_success -> активировать
  // subscription_cancelled/expired -> деактивировать

  return NextResponse.json("OK", { status: 200 });
}