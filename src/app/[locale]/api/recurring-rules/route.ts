import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedClient } from "@/lib/serverSupabase";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req);
    const body = await req.json();

    const isPro =
      ((user.user_metadata || {}) as any)?.subscription_status === "pro";
    if (!isPro) {
      const { count, error: countErr } = await supabase
        .from("recurring_rules")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!countErr && (count ?? 0) >= 2) {
        return NextResponse.json({ error: "limitReached" }, { status: 403 });
      }
    }

    const payload = {
      user_id: user.id,
      title_pattern: String(body.title_pattern || "").trim(),
      budget_folder_id: body.budget_folder_id ?? null,
      avg_amount: Number(body.avg_amount),
      cadence: body.cadence === "weekly" ? "weekly" : "monthly",
      next_due_date: String(
        body.next_due_date || new Date().toISOString().slice(0, 10),
      ),
      active: true,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("recurring_rules")
      .upsert(payload, { onConflict: "user_id,title_pattern" })
      .select();

    if (error) {
      return NextResponse.json({ error: "saveFailed" }, { status: 400 });
    }
    return NextResponse.json({ rule: (data || [])[0] }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "saveFailed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req);
    const body = await req.json();
    const id = String(body.id || "");
    if (!id)
      return NextResponse.json({ error: "updateFailed" }, { status: 400 });

    const patch: any = {};
    if (typeof body.title_pattern === "string")
      patch.title_pattern = body.title_pattern;
    if (body.cadence === "weekly" || body.cadence === "monthly")
      patch.cadence = body.cadence;
    if (typeof body.avg_amount === "number") patch.avg_amount = body.avg_amount;
    if (
      typeof body.budget_folder_id === "string" ||
      body.budget_folder_id === null
    )
      patch.budget_folder_id = body.budget_folder_id;
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("recurring_rules")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select();

    if (error) {
      return NextResponse.json({ error: "updateFailed" }, { status: 400 });
    }
    return NextResponse.json({ rule: (data || [])[0] }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "updateFailed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedClient(req);
    const body = await req.json();
    const id = String(body.id || "");
    if (!id)
      return NextResponse.json({ error: "deleteFailed" }, { status: 400 });

    const { error } = await supabase
      .from("recurring_rules")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "deleteFailed" }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ error: "deleteFailed" }, { status: 500 });
  }
}
