import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function inferDraft(text: string) {
  const lower = text.toLowerCase();
  const tags: string[] = [];
  if (lower.includes("beginner")) tags.push("beginner-friendly");
  if (lower.includes("board game")) tags.push("board games");
  if (lower.includes("outdoor") || lower.includes("walk")) tags.push("outdoors");
  if (tags.length < 3) tags.push("social", "casual");

  const capacityMatch = text.match(/(\d+)\s*(people|players|spots)/i);
  const costMatch = text.match(/€\s*(\d+)/);

  return {
    title: { value: text.split(/[.!?\n]/)[0].slice(0, 80), confidence: 0.7, origin: "inferred" as const },
    description: { value: text, confidence: 0.9, origin: "extracted" as const },
    capacity: capacityMatch
      ? { value: Number(capacityMatch[1]), confidence: 0.9, origin: "extracted" as const }
      : { value: 8, confidence: 0.3, origin: "default" as const },
    cost_amount: costMatch
      ? { value: Number(costMatch[1]), confidence: 0.9, origin: "extracted" as const }
      : { value: 0, confidence: 0.5, origin: "default" as const },
    suggested_tags: tags.slice(0, 8),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { free_text } = await req.json();
  if (!free_text) {
    return new Response(JSON.stringify({ error: { code: "VALIDATION_FAILED", message: "free_text required" } }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return new Response(JSON.stringify({ data: inferDraft(free_text) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
