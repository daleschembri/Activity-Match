import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { AppNotification } from "@activity-match/shared";
import { useAuth } from "@/lib/AuthProvider";
import {
  browserNotificationsSupported,
  BROWSER_NOTIFICATION_NAVIGATE_EVENT,
  formatChatMessagePreview,
  getBrowserNotificationPermission,
  showBrowserNotification,
} from "@/lib/browserNotifications";
import { hasActivePushSubscription, subscribeToWebPush, vapidPublicKeyConfigured } from "@/lib/pushNotifications";
import { getNotificationHref } from "@/lib/notifications";
import { api } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ConversationMeta = {
  activityId: string;
  title: string;
};

/**
 * Subscribes to alert-centre and chat inserts, surfacing browser notifications
 * when the user has granted permission.
 */
export function BrowserNotificationBridge() {
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locationRef = useRef(location.pathname);
  const conversationMapRef = useRef<Map<string, ConversationMeta>>(new Map());

  locationRef.current = location.pathname;

  useEffect(() => {
    const handler = (event: Event) => {
      const path = (event as CustomEvent<{ path: string }>).detail?.path;
      if (path) navigate(path);
    };
    window.addEventListener(BROWSER_NOTIFICATION_NAVIGATE_EVENT, handler);
    return () => window.removeEventListener(BROWSER_NOTIFICATION_NAVIGATE_EVENT, handler);
  }, [navigate]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user.id) return;
    if (!browserNotificationsSupported()) return;

    const userId = session.user.id;

    void (async () => {
      if (getBrowserNotificationPermission() === "granted" && vapidPublicKeyConfigured()) {
        await subscribeToWebPush(userId);
      }

      const chats = await api.getMyChats();
      const activityIds = chats.map((chat) => chat.id);
      if (activityIds.length) {
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id, activity_id")
          .in("activity_id", activityIds);

        const titleByActivity = new Map(chats.map((chat) => [chat.id, chat.title]));
        conversationMapRef.current = new Map(
          (conversations ?? []).map((row) => [
            row.id as string,
            {
              activityId: row.activity_id as string,
              title: titleByActivity.get(row.activity_id as string) ?? "Activity chat",
            },
          ]),
        );
      }
    })();

    const alertsChannel = supabase
      .channel(`browser-notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as AppNotification;
          const href = getNotificationHref(row);

          void queryClient.invalidateQueries({ queryKey: ["notifications"] });
          void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });

          if (locationRef.current === href) return;
          if (await hasActivePushSubscription()) return;

          showBrowserNotification({
            title: row.title,
            body: row.body,
            tag: `alert-${row.id}`,
            href,
          });
        },
      )
      .subscribe();

    const messagesChannel = supabase
      .channel(`browser-chat-messages:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            sender_user_id: string | null;
            type: string;
            body: string;
          };

          if (row.sender_user_id === userId) return;

          let meta = conversationMapRef.current.get(row.conversation_id);
          if (!meta) {
            const { data: conversation } = await supabase
              .from("conversations")
              .select("activity_id, activity:activities(id, title)")
              .eq("id", row.conversation_id)
              .maybeSingle();

            const activity = conversation?.activity as { id: string; title: string } | { id: string; title: string }[] | null;
            const activityRow = Array.isArray(activity) ? activity[0] : activity;
            const activityId = (conversation?.activity_id as string | undefined) ?? activityRow?.id;
            if (!activityId) return;

            meta = {
              activityId,
              title: activityRow?.title ?? "Activity chat",
            };
            conversationMapRef.current.set(row.conversation_id, meta);
          }

          const chatPath = `/activities/${meta.activityId}/chat`;
          if (locationRef.current === chatPath) return;

          let senderName: string | null = null;
          if (row.sender_user_id) {
            const { data: sender } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", row.sender_user_id)
              .maybeSingle();
            senderName = (sender?.display_name as string | undefined) ?? null;
          }

          const preview = formatChatMessagePreview(row.type, row.body, senderName);

          void queryClient.invalidateQueries({ queryKey: ["messages", meta.activityId] });
          void queryClient.invalidateQueries({ queryKey: ["my-chats"] });
          void queryClient.invalidateQueries({ queryKey: ["chats-unread"] });

          if (await hasActivePushSubscription()) return;

          showBrowserNotification({
            title: `${preview.title} · ${meta.title}`,
            body: preview.body,
            tag: `chat-${meta.activityId}`,
            href: chatPath,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(alertsChannel);
      void supabase.removeChannel(messagesChannel);
    };
  }, [session?.user.id, queryClient]);

  return null;
}
