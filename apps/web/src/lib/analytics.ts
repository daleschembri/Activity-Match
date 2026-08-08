import { supabase } from "./supabase";

export function trackEvent(eventName: string, properties: Record<string, unknown> = {}) {
  void supabase.from("analytics_events").insert({ event_name: eventName, properties }).then(() => undefined);
}
