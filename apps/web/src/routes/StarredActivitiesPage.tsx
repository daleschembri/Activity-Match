import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityCard, Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import type { ActivitySummary } from "@activity-match/shared";
import { JoinRequestSheet } from "@/components/JoinRequestSheet";
import { api } from "@/lib/api";

export function StarredActivitiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [joinTarget, setJoinTarget] = useState<ActivitySummary | null>(null);
  const [joining, setJoining] = useState(false);

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["starred-activities"],
    queryFn: () => api.getStarredActivities(),
    refetchOnMount: "always",
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["starred-activities"] });
    void queryClient.invalidateQueries({ queryKey: ["feed"] });
  };

  const pass = useMutation({
    mutationFn: (activityId: string) =>
      api.recordSwipe({
        activity_id: activityId,
        direction: "left",
        position_in_feed: 0,
        dwell_ms: 0,
        idempotency_key: `starred-pass-${activityId}`,
      }),
    onSuccess: invalidate,
  });

  const submitJoin = async (introduction: string) => {
    if (!joinTarget) return;
    setJoining(true);
    try {
      await api.recordSwipe({
        activity_id: joinTarget.id,
        direction: "right",
        position_in_feed: 0,
        dwell_ms: 0,
        idempotency_key: `starred-join-${joinTarget.id}`,
        introduction,
      });
      setJoinTarget(null);
      invalidate();
    } catch {
      window.alert("Could not send your join request. Try again from the activity page.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <ScreenShell
      title="Starred"
      headerRight={
        <button type="button" onClick={() => navigate(-1)} aria-label="Close">
          <Icon name="close" />
        </button>
      }
    >
      <p className="text-body-md text-on-surface-variant mb-6">
        Activities you starred but haven&apos;t joined or passed on yet.
      </p>

      {isLoading && <p className="text-on-surface-variant">Loading starred activities...</p>}

      {!isLoading && activities.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <Icon name="star" className="text-4xl text-on-surface-variant mx-auto opacity-50" />
          <p className="text-body-md text-on-surface-variant">No starred activities waiting for a decision.</p>
          <PrimaryButton variant="outline" onClick={() => navigate("/")}>
            Back to discover
          </PrimaryButton>
        </div>
      )}

      <div className="space-y-4">
        {activities.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onOpen={() => navigate(`/activities/${activity.id}`)}
            actions={
              <>
                <PrimaryButton
                  variant="outline"
                  fullWidth
                  disabled={pass.isPending || joining}
                  onClick={() => pass.mutate(activity.id)}
                >
                  Pass
                </PrimaryButton>
                <PrimaryButton
                  fullWidth
                  disabled={pass.isPending || joining}
                  onClick={() => setJoinTarget(activity)}
                >
                  {activity.is_full ? "Join waitlist" : "Join"}
                </PrimaryButton>
              </>
            }
          />
        ))}
      </div>

      {joinTarget && (
        <JoinRequestSheet
          open={Boolean(joinTarget)}
          activityTitle={joinTarget.title}
          hostName={joinTarget.host.display_name}
          isWaitlist={joinTarget.is_full}
          loading={joining}
          onClose={() => setJoinTarget(null)}
          onSubmit={submitJoin}
        />
      )}
    </ScreenShell>
  );
}
