import { NextRequest, NextResponse } from "next/server";
import {
  getAuthenticatedClient,
  getServerSupabaseClient,
} from "@/lib/serverSupabase";

export async function GET(req: NextRequest) {
  try {
    // Чтение через сервис‑ключ — всегда доступно
    const srv = getServerSupabaseClient();
    const { data, error } = await srv
      .from("remote_config")
      .select("value")
      .eq("id", "ai_daily_limit")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to read config" },
        { status: 500 },
      );
    }

    const raw = (data as any)?.value;
    const limit =
      typeof raw === "object" && raw !== null
        ? Number((raw as any).limit)
        : Number(raw);

    return NextResponse.json({ limit: Number.isFinite(limit) ? limit : 5 });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Требуем аутентификацию и проверяем is_admin
    const { user } = await getAuthenticatedClient(req);
    const isAdmin = Boolean((user.user_metadata as any)?.is_admin === true);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = await req.json().catch(() => ({}));
    const requested =
      typeof payload.limit === "number" ? payload.limit : undefined;

    // Узнаем текущий лимит
    const srv = getServerSupabaseClient();
    const { data: current } = await srv
      .from("remote_config")
      .select("value")
      .eq("id", "ai_daily_limit")
      .single();

    const raw = (current as any)?.value;
    const currentLimit =
      typeof raw === "object" && raw !== null
        ? Number((raw as any).limit)
        : Number(raw);

    // Решаем следующий лимит: либо из payload, либо toggle
    let nextLimit: number;
    if (requested === 5 || requested === 10) {
      nextLimit = requested;
    } else {
      nextLimit = currentLimit === 10 ? 5 : 10;
    }

    const upsertRes = await srv
      .from("remote_config")
      .upsert(
        [
          {
            id: "ai_daily_limit",
            value: { limit: nextLimit },
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: "id" },
      );

    if (upsertRes.error) {
      return NextResponse.json(
        { error: "Failed to update config" },
        { status: 500 },
      );
    }

    return NextResponse.json({ limit: nextLimit });
  } catch (e) {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
