import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BottomNav, FilterChip, Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { DiscoverFeedCard } from "@/components/DiscoverFeedCard";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { flushQueue, queueSwipe } from "@/lib/offline-queue";
import { mainNavCurrentPath, mainNavItems } from "@/lib/mainNav";

export function DiscoverPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["feed"],
    queryFn: () => api.getFeed(),
    refetchOnMount: "always",
  });

  useEffect(() => {
    void flushQueue(async (item) => {
      await api.recordSwipe({ ...item.payload, idempotency_key: item.idempotency_key });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["my-chats"] });
    });
  }, [queryClient]);

  const items = data?.items ?? [];
  const current = items[0] ?? null;

  const handleSwipe = async (direction: "left" | "right" | "up") => {
    if (!current) return;
    const key = `swipe-${current.id}-${direction}`;
    try {
      await api.recordSwipe({
        activity_id: current.id,
        direction,
        position_in_feed: 0,
        dwell_ms: 1200,
        idempotency_key: key,
      });
      await queryClient.invalidateQueries({ queryKey: ["feed"] });
      await queryClient.invalidateQueries({ queryKey: ["my-chats"] });
    } catch {
      queueSwipe({ activity_id: current.id, direction, position_in_feed: 0, dwell_ms: 1200 }, key);
    }
    trackEvent("swipe", { activity_id: current.id, direction, position: 0 });

    const remaining = items.filter((item) => item.id !== current.id);
    if (remaining.length === 0) {
      navigate("/feed/exhausted");
    }
  };

  return (
    <ScreenShell
      title="Discover"
      headerRight={
        <button type="button" onClick={() => navigate("/filters")} aria-label="Open filters">
          <Icon name="tune" />
        </button>
      }
      footer={<BottomNav items={[...mainNavItems]} currentPath={mainNavCurrentPath(location.pathname)} onNavigate={navigate} />}
    >
      <div className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <FilterChip label="This week" selected />
          <FilterChip label="Free" />
          <FilterChip label="Nearby" />
        </div>
        {error && (
          <div className="bg-error-container text-on-error-container rounded-xl p-4 text-body-md">
            {(error as Error).message}
            <p className="mt-2 text-label-sm">Check docs/SUPABASE_SETUP.md — have you run db push and set .env?</p>
          </div>
        )}
        {isLoading && <p className="text-on-surface-variant">Loading activities...</p>}
        {!isLoading && !current && (
          <div className="text-center py-12 space-y-4">
            <Icon name="search_off" className="text-4xl text-on-surface-variant mx-auto" />
            <p>No more activities match your filters.</p>
            <PrimaryButton onClick={() => navigate("/feed/exhausted")}>See options</PrimaryButton>
          </div>
        )}
        {current && (
          <>
            <DiscoverFeedCard activity={current} onOpen={() => navigate(`/activities/${current.id}`)} />
            <div className="grid grid-cols-3 gap-3 pt-2" role="group" aria-label="Activity actions">
              <PrimaryButton variant="outline" onClick={() => handleSwipe("left")} aria-label="Pass">
                <Icon name="close" />
              </PrimaryButton>
              <PrimaryButton variant="secondary" onClick={() => handleSwipe("up")} aria-label="Save for later">
                <Icon name="bookmark" />
              </PrimaryButton>
              <PrimaryButton onClick={() => handleSwipe("right")} aria-label="Join or request">
                <Icon name="favorite" />
              </PrimaryButton>
            </div>
            <p className="text-label-sm text-on-surface-variant text-center">
              Button alternatives available for all swipe actions
            </p>
          </>
        )}
      </div>
    </ScreenShell>
  );
}
