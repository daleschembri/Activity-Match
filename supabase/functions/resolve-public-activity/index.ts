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
  );

  const { public_slug } = await req.json();
  const { data: activity } = await supabase
    .from("activities")
    .select("*, category:categories(*), host:profiles!activities_host_user_id_fkey(id, display_name, avatar_ref)")
    .eq("public_slug", public_slug)
    .eq("status", "published")
    .single();

  if (!activity) {
    return new Response(JSON.stringify({ error: { code: "NOT_FOUND", message: "Activity not found" } }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    data: {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      listing_type: activity.listing_type,
      status: activity.status,
      starts_at: activity.starts_at,
      capacity: activity.capacity,
      spaces_remaining: activity.capacity,
      participation_count: 0,
      is_full: false,
      is_joinable: true,
      cost_amount: Number(activity.cost_amount),
      cost_currency: activity.cost_currency,
      skill_level: activity.skill_level,
      area_label: "Area",
      host: activity.host,
      category: activity.category,
      tags: [],
      viewer_role: "anonymous",
      public_slug: activity.public_slug,
      participant_count_visible: 0,
    },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=60" } });
});
