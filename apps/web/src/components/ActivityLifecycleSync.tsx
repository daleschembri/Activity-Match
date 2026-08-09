import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthProvider";
import { api } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/supabase";

/**
 * Runs background activity lifecycle jobs (expire, post-event prompts) when the
 * user opens the app. Without this, attendance reminders only fire if a cron
 * job calls expire_activities().
 */
export function ActivityLifecycleSync() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const ranForSession = useRef<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user.id) return;
    if (ranForSession.current === session.user.id) return;
    ranForSession.current = session.user.id;

    void api.processActivityLifecycle().then(() => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["my-plans"] });
    });
  }, [session?.user.id, queryClient]);

  return null;
}
