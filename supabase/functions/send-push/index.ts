import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-secret",
};

type PushPayload = {
  secret?: string;
  user_id: string;
  title: string;
  body: string;
  tag?: string;
  kind?: "alert" | "chat";
  notification_type?: string;
  activity_id?: string | null;
  join_request_id?: string | null;
};

function notificationPath(payload: PushPayload): string {
  const type = payload.notification_type;
  const activityId = payload.activity_id;
  const joinRequestId = payload.join_request_id;

  if (payload.kind === "chat" && activityId) {
    return `/activities/${activityId}/chat`;
  }

  switch (type) {
    case "join_request_received":
      return "/host/requests";
    case "join_request_accepted":
      return activityId ? `/activities/${activityId}/chat` : "/plans";
    case "join_request_declined":
    case "join_request_waitlisted":
      return activityId ? `/activities/${activityId}` : "/plans";
    case "waitlist_offered":
      return joinRequestId ? `/waitlist/${joinRequestId}` : activityId ? `/activities/${activityId}` : "/plans";
    case "waitlist_spot_opened":
      return "/host/requests?tab=waitlisted";
    case "attendance_record_updated":
      return activityId ? `/activities/${activityId}/attendance/outcome` : "/plans";
    case "attendance_dispute_submitted":
      return activityId ? `/activities/${activityId}/attendance` : "/host/requests";
    case "activity_updated":
      return activityId ? `/activities/${activityId}` : "/plans";
    case "participant_removed":
      return "/plans";
    case "participant_joined":
      return activityId ? `/activities/${activityId}` : "/plans";
    case "attendance_mark_reminder":
      return activityId ? `/activities/${activityId}/attendance` : "/plans";
    case "feedback_prompt":
      return activityId ? `/activities/${activityId}/feedback` : "/plans";
    default:
      return "/notifications";
  }
}

function truncate(text: string, max = 140): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const expectedSecret = Deno.env.get("PUSH_INTERNAL_SECRET");
  const headerSecret = req.headers.get("x-push-secret");
  const payload = (await req.json()) as PushPayload;

  if (!expectedSecret || payload.secret !== expectedSecret || headerSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:support@gathere.app";

  if (!vapidPublicKey || !vapidPrivateKey) {
    return new Response(JSON.stringify({ error: "VAPID not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subscriptions, error } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", payload.user_id);

  if (error || !subscriptions?.length) {
    return new Response(JSON.stringify({ data: { sent: 0 } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = notificationPath(payload);
  const pushBody = JSON.stringify({
    title: payload.title,
    body: truncate(payload.body),
    url,
    tag: payload.tag ?? `push-${payload.user_id}`,
  });

  let sent = 0;
  const staleIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        pushBody,
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        staleIds.push(sub.id);
      }
      console.error("web-push failed", sub.endpoint, err);
    }
  }

  if (staleIds.length) {
    await admin.from("push_subscriptions").delete().in("id", staleIds);
  }

  return new Response(JSON.stringify({ data: { sent, stale: staleIds.length } }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
