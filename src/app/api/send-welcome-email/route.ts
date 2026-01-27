import { NextRequest, NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/brevo";
import { getServerSupabaseClient } from "@/lib/serverSupabase";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabaseAdmin = getServerSupabaseClient();

    console.log("[WelcomeEmail] request", {
      userId,
      hasUserId: typeof userId === "string" && userId.length > 0,
    });

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, first_name")
      .eq("id", userId)
      .single();

    if (profileError) {
      const code = (profileError as any)?.code;
      const message = (profileError as any)?.message;
      const isMissingRelation =
        code === "42P01" ||
        (typeof message === "string" && message.includes('relation "profiles" does not exist'));

      console.error("[WelcomeEmail] Failed to load profile", {
        userId,
        code,
        message,
      });

      if (isMissingRelation) {
        return NextResponse.json(
          { error: "profiles table is missing" },
          { status: 503 },
        );
      }
    }

    const profileNotFound =
      !!profileError &&
      ((profileError as any)?.code === "PGRST116" ||
        (typeof (profileError as any)?.message === "string" &&
          (profileError as any).message.toLowerCase().includes("0 rows")));

    const profileEmail =
      typeof profile?.email === "string" ? profile.email.trim() : "";
    const profileFirstName =
      typeof profile?.first_name === "string" ? profile.first_name.trim() : "";

    let email = profileEmail;
    let firstName = profileFirstName;

    if (!email) {
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      const authEmail = typeof authData?.user?.email === "string" ? authData.user.email.trim() : "";
      const meta = (authData?.user?.user_metadata as any) || {};
      const metaFirst =
        typeof meta?.first_name === "string"
          ? meta.first_name
          : typeof meta?.firstName === "string"
            ? meta.firstName
            : "";

      if (authErr) {
        console.error("[WelcomeEmail] Failed to load auth user", {
          userId,
          error: authErr.message,
        });
      }

      if (!email && authEmail) email = authEmail;
      if (!firstName && typeof metaFirst === "string" && metaFirst.trim()) {
        firstName = metaFirst.trim();
      }

      if (email && (profileNotFound || !profileEmail)) {
        const patch: Record<string, string> = { email };
        if (firstName) patch.first_name = firstName;
        const upd = await supabaseAdmin
          .from("profiles")
          .upsert([{ id: userId, ...patch }], { onConflict: "id" });
        if (upd.error) {
          console.warn("[WelcomeEmail] Failed to upsert profile email", {
            userId,
            error: upd.error.message,
          });
        }
      }
    }

    if (!email) {
      console.error("[WelcomeEmail] Email not found for user", { userId });
      return NextResponse.json({ error: "Email not found" }, { status: 404 });
    }

    console.log("[WelcomeEmail] Resolved recipient", {
      userId,
      hasEmail: email.length > 0,
      hasFirstName: firstName.length > 0,
      usedProfile: !!profileEmail,
    });

    const result = await sendWelcomeEmail(email, firstName || "Friend");

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[WelcomeEmail] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
