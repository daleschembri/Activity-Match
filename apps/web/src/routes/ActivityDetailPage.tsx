import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CapacityBadge, Icon, PrimaryButton, ScreenShell } from "@activity-match/ui";
import { api } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";

export function ActivityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <ScreenShell title="Activity"><p>Loading...</p></ScreenShell>;
  if (!activity) return <ScreenShell title="Activity"><p>Not found</p></ScreenShell>;

  const canChat = activity.viewer_role === "host" || activity.viewer_role === "participant";
  const joinPending = activity.viewer_role === "requester";
  const isParticipant = activity.viewer_role === "participant";

  const invalidateActivityQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["activity", id] }),
      queryClient.invalidateQueries({ queryKey: ["my-plans"] }),
      queryClient.invalidateQueries({ queryKey: ["my-chats"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
    ]);
  };

  const join = async () => {
    trackEvent("join_request_created", { activity_id: id, source: "detail" });
    await api.createJoinRequest({
      activity_id: id,
      availability_confirmed: true,
      idempotency_key: `join-${id}`,
    });
    await invalidateActivityQueries();
    const updated = await api.getActivity(id);
    if (updated?.viewer_role === "participant" || updated?.viewer_role === "host") {
      navigate(`/activities/${id}/chat`);
    }
  };

  const leave = async () => {
    if (!window.confirm("Leave this activity? You can request to join again later.")) return;
    setLeaving(true);
    try {
      await api.leaveActivity(id);
      trackEvent("activity_left", { activity_id: id });
      await invalidateActivityQueries();
      navigate("/plans");
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not leave activity");
    } finally {
      setLeaving(false);
    }
  };

  const withdrawRequest = async () => {
    if (!window.confirm("Withdraw your join request?")) return;
    setLeaving(true);
    try {
      await api.withdrawJoinRequest(id);
      await invalidateActivityQueries();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not withdraw request");
    } finally {
      setLeaving(false);
    }
  };

  return (
    <ScreenShell
      title="Activity Details"
      headerRight={
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
          <Icon name="arrow_back" />
        </button>
      }
    >
      <div className="space-y-5 pb-24">
        {activity.cover_image_ref && (
          <div className="relative -mx-margin-mobile -mt-gutter h-52 overflow-hidden">
            <img src={activity.cover_image_ref} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <p className="text-label-sm uppercase text-on-surface-variant">{activity.category.name}</p>
          <h1 className="text-headline-lg-mobile font-extrabold mt-1">{activity.title}</h1>
        </div>
        {activity.capacity != null && (
          <CapacityBadge remaining={activity.spaces_remaining ?? 0} capacity={activity.capacity} />
        )}
        {joinPending && (
          <p className="text-body-md text-on-surface-variant bg-surface-container rounded-xl p-4">
            Your join request is pending. You can chat once the host accepts you.
          </p>
        )}
        <p className="text-body-md text-on-surface-variant">{activity.description}</p>
        <div className="bg-surface-container rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2"><Icon name="schedule" /><span>{activity.starts_at ? new Date(activity.starts_at).toLocaleString() : "Flexible"}</span></div>
          <div className="flex items-center gap-2"><Icon name="location_on" /><span>{activity.area_label}</span></div>
          <div className="flex items-center gap-2"><Icon name="payments" /><span>{activity.cost_amount > 0 ? `${activity.cost_currency} ${activity.cost_amount}` : "Free"}</span></div>
          <div className="flex items-center gap-2"><Icon name="person" /><span>Hosted by {activity.host.display_name}</span></div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-margin-mobile bg-surface border-t border-outline-variant/30 flex gap-3">
          {canChat && (
            <PrimaryButton variant="outline" onClick={() => navigate(`/activities/${id}/chat`)}>
              Chat
            </PrimaryButton>
          )}
          {activity.viewer_role === "host" ? (
            <PrimaryButton fullWidth onClick={() => navigate("/host/requests")}>
              Manage requests
            </PrimaryButton>
          ) : isParticipant ? (
            <PrimaryButton variant="danger" fullWidth disabled={leaving} onClick={leave}>
              {leaving ? "Leaving..." : "Leave activity"}
            </PrimaryButton>
          ) : joinPending ? (
            <PrimaryButton variant="outline" fullWidth disabled={leaving} onClick={withdrawRequest}>
              {leaving ? "Withdrawing..." : "Withdraw request"}
            </PrimaryButton>
          ) : (
            <PrimaryButton fullWidth disabled={!activity.is_joinable} onClick={join}>
              {activity.is_full ? "Join waitlist" : "Join activity"}
            </PrimaryButton>
          )}
        </div>
      </div>
    </ScreenShell>
  );
}
