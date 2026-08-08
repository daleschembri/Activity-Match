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

  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");
  const { data: { user } } = token
    ? await createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      }).auth.getUser()
    : { data: { user: null } };

  const { filters, cursor, limit = 20 } = await req.json();

  let query = supabase
    .from("activities")
    .select("*, category:categories(*), host:profiles!activities_host_user_id_fkey(id, display_name, avatar_ref)")
    .eq("status", "published")
    .eq("visibility", "public")
    .order("published_at", { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt("published_at", cursor);

  const { data: activities, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: { code: "VALIDATION_FAILED", message: error.message } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }

  const items = (activities ?? []).map((a) => ({
    id: a.id,
    title: a.title,
    listing_type: a.listing_type,
    status: a.status,
    category: a.category,
    starts_at: a.starts_at,
    duration_minutes: a.duration_minutes,
    area_label: null,
    distance_from_viewer_minutes: null,
    cost_amount: Number(a.cost_amount),
    cost_currency: a.cost_currency,
    skill_level: a.skill_level,
    capacity: a.capacity,
    participation_count: 0,
    spaces_remaining: a.capacity,
    is_full: false,
    is_joinable: true,
    host: a.host,
    tags: [],
  }));

  return new Response(JSON.stringify({
    data: {
      items,
      next_cursor: items.length ? activities?.[activities.length - 1]?.published_at : null,
      total_available: items.length,
      exhausted: items.length < limit,
      filters_widened: false,
    },
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
