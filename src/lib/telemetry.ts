import { supabase } from "./supabaseClient";

type TelemetryEvent =
  | "ai_request_used"
  | "ai_limit_hit"
  | "upgrade_cta_clicked"
  | "digest_generated"
  | "ai_session_created"
  | "ai_message_sent"
  | "ai_title_generated"
  | "ai_session_synced";

export async function trackEvent(
  name: TelemetryEvent,
  payload?: Record<string, any>,
) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[TELEMETRY]", name, payload);
    return;
  }

  try {
    const { error } = await supabase
      .from("telemetry")
      .insert([{ event_name: name, payload }]);

    if (error) {
      console.error("Error tracking event:", error);
    }
  } catch (error) {
    console.error("Error inserting telemetry event:", error);
  }
}
