import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
  );

  const { activity_id, direction, position_in_feed, dwell_ms, idempotency_key } = await req.json();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: { code: "NOT_PERMITTED", message: "Auth required" } }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await supabase.from("swipe_events").upsert({
    user_id: user.id,
    activity_id,
    direction,
    position_in_feed,
    dwell_ms,
  }, { onConflict: "user_id,activity_id" });

  if (direction === "right") {
    await supabase.rpc("create_join_request_atomic", {
      p_user_id: user.id,
      p_activity_id: activity_id,
      p_introduction: null,
      p_availability_confirmed: true,
      p_source: "swipe",
    });
  } else if (direction === "up") {
    await supabase.from("saved_activities").upsert({ user_id: user.id, activity_id });
  }

  return new Response(JSON.stringify({ data: { ok: true, idempotency_key } }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
