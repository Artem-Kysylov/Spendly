import { supabase } from "./supabaseClient";

type TelemetryEvent =
  | "ai_request_used"
  | "ai_limit_hit"
  | "upgrade_cta_clicked"
  | "digest_generated"
  | "ai_session_created"
  | "ai_message_sent"
  | "ai_title_generated"
  | "ai_session_synced"
  | "paywall_cta_clicked"
  | "limit_reached_upgrade_clicked";

export async function trackEvent(
  name: TelemetryEvent,
  payload?: Record<string, any>,
) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[TELEMETRY]", name, payload);
    return;
  }

  // Telemetry disabled: table does not exist in production
  // Uncomment below when telemetry table is created
  return;

  // try {
  //   const { error } = await supabase
  //     .from("telemetry")
  //     .insert([{ event_name: name, payload }]);

  //   if (error) {
  //     // Silently fail - telemetry should not break user experience
  //   }
  // } catch (error) {
  //   // Silently fail - telemetry should not break user experience
  // }
}
