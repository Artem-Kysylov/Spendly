import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  // Add: update Supabase user_metadata.subscription_status based on event
  const customerEmail = payload?.data?.attributes?.customer_email;
  if (customerEmail) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: users } = await supabase
      .from('auth.users') // Supabase REST exposes users via admin; alternatively use supabase.auth.admin
      .select('id, email')
      .ilike('email', customerEmail)
      .limit(1);

    const userId = users?.[0]?.id;
    if (userId) {
      const status =
        eventName === 'subscription_payment_success' ? 'pro' :
        eventName === 'subscription_cancelled' || eventName === 'subscription_expired' ? 'free' :
        undefined;

      if (status) {
        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { subscription_status: status }
        });
      }
    }
  }

  return NextResponse.json("OK", { status: 200 });
}