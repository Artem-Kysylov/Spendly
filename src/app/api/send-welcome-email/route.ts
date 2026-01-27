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

    if (profileError || !profile) {
      console.error("[WelcomeEmail] Profile not found", {
        userId,
        error: profileError?.message,
      });
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    console.log("[WelcomeEmail] Profile loaded", {
      userId,
      hasEmail: typeof profile.email === "string" && profile.email.length > 0,
      hasFirstName: typeof profile.first_name === "string" && profile.first_name.length > 0,
    });

    const firstName = profile.first_name || "Friend";
    const result = await sendWelcomeEmail(profile.email, firstName);

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
