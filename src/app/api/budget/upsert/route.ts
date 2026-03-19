import { NextRequest } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";
import { normalizeBudgetName } from "@/lib/utils";

type Body = {
  name?: string;
  amount?: number;
  type?: "expense" | "income";
  emoji?: string;
  color?: string | null;
  period?: string;
};

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req);

    const body = (await req.json().catch(() => null)) as Body | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const amount = typeof body?.amount === "number" ? Number(body.amount) : Number.NaN;
    const type: "expense" | "income" = body?.type === "income" ? "income" : "expense";
    const emoji = typeof body?.emoji === "string" ? body.emoji.trim() : "";
    const color = body?.color ?? null;

    if (!name || !Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const normalized = normalizeBudgetName(name);

    const { data: existing, error: findErr } = await supabase
      .from("budget_folders")
      .select("id, name, color_code")
      .eq("user_id", user.id);

    if (findErr) {
      return new Response(JSON.stringify({ error: "Failed to read budgets" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const match = (existing || []).find(
      (b: any) => normalizeBudgetName(String(b?.name || "")) === normalized,
    );

    const color_code = typeof color === "string" && color.trim() ? color.trim().replace(/^#/, "") : null;

    if (match?.id) {
      const { error: updErr } = await supabase
        .from("budget_folders")
        .update({
          amount,
          type,
          emoji: emoji || null,
          ...(color_code ? { color_code } : {}),
        })
        .eq("id", match.id)
        .eq("user_id", user.id);

      if (updErr) {
        return new Response(JSON.stringify({ error: "Failed to update budget" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true, id: match.id, updated: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: inserted, error: insErr } = await supabase
      .from("budget_folders")
      .insert({
        user_id: user.id,
        name,
        amount,
        type,
        emoji: emoji || null,
        color_code,
      })
      .select("id")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: "Failed to create budget" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted?.id, created: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
