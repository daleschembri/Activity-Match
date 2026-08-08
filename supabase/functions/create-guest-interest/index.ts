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
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { public_slug, display_name, contact_ref } = await req.json();

  const { data: activity } = await supabase
    .from("activities")
    .select("id, visibility, status")
    .eq("public_slug", public_slug)
    .single();

  if (!activity || activity.status !== "published") {
    return new Response(JSON.stringify({ error: { code: "ACTIVITY_NOT_JOINABLE", message: "Not joinable" } }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const contactHash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(contact_ref),
  );
  const hashHex = Array.from(new Uint8Array(contactHash)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const { data: guest } = await supabase.from("guests").insert({
    display_name,
    contact_ref_hash: hashHex,
    verified_at: new Date().toISOString(),
  }).select().single();

  await supabase.from("join_requests").insert({
    activity_id: activity.id,
    guest_id: guest?.id,
    intent: "join",
    status: "pending",
    source: "share_link",
  });

  return new Response(JSON.stringify({ data: { guest_id: guest?.id } }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
