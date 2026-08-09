import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ActivityDetail } from "@activity-match/shared";
import { Icon, PrimaryButton } from "@activity-match/ui";
import { ActivityMeetingMap } from "@/components/ActivityMeetingMap";
import { ActivityOptionsSheet } from "@/components/ActivityOptionsSheet";
import { JoinRequestSheet } from "@/components/JoinRequestSheet";
import { CapacitySegments, capacityStatusLabel } from "@/components/CapacitySegments";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/primitives";
import { api } from "@/lib/api";
import { APP_NAME } from "@/lib/brand";
import { trackEvent } from "@/lib/analytics";

function formatDetailWhen(startsAt: string | null): string {
  if (!startsAt) return "Flexible timing";
  const date = new Date(startsAt);
  const day = date.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric" });
  const time = date.toLocaleString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day} • ${time}`;
}

function hostInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function parseBringItems(activity: ActivityDetail): Array<{ icon: string; label: string }> {
  if (activity.equipment_note?.trim()) {
    return activity.equipment_note
      .split(/\n|•/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label) => ({ icon: "backpack", label }));
  }
  const defaults: Array<{ icon: string; label: string }> = [];
  if (activity.equipment_provided) {
    defaults.push({ icon: "inventory_2", label: "Equipment provided by the host" });
  }
  if (activity.cost_amount === 0) {
    defaults.push({ icon: "payments", label: "No payment needed" });
  }
  return defaults;
}

function ParticipantAvatar({
  participant,
  isHost,
}: {
  participant: { display_name: string; avatar_ref: string | null };
  isHost?: boolean;
}) {
  const inner = participant.avatar_ref ? (
    <img src={participant.avatar_ref} alt="" className="w-full h-full object-cover" />
  ) : (
    <span className="text-label-sm font-bold text-on-surface-variant">
      {hostInitials(participant.display_name)}
    </span>
  );

  return (
    <div
      className={`relative w-12 h-12 rounded-full overflow-hidden bg-surface-container flex items-center justify-center ${
        isHost ? "border-2 border-primary" : ""
      }`}
    >
      {inner}
    </div>
  );
}

function AboutHostSection({ activity }: { activity: ActivityDetail }) {
  const { data: reliability } = useQuery({
    queryKey: ["reliability", activity.host.id],
    queryFn: () => api.getReliability(activity.host.id),
  });
  const isEstablished = reliability?.label !== "New to the platform";

  return (
    <section className="mb-8">
      <h2 className="font-headline-md text-headline-md mb-4 text-on-background">About the host</h2>
      <div className="bg-surface-container rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-3">
          <ParticipantAvatar participant={activity.host} isHost />
          <div>
            <p className="font-label-bold text-label-bold text-on-surface">{activity.host.display_name}</p>
            <p className="font-label-sm text-label-sm text-primary flex items-center gap-1">
              {isEstablished && <Icon name="verified" className="text-[14px]" />}
              {isEstablished ? "High Reliability" : "New host"}
            </p>
          </div>
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line">
          {activity.host.bio?.trim() ||
            `${activity.host.display_name} hosts activities on ${APP_NAME}. Say hello in the chat once you join.`}
        </p>
      </div>
    </section>
  );
}

export function ActivityDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [leaving, setLeaving] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => api.getActivity(id),
    enabled: Boolean(id),
  });

  const bringItems = useMemo(() => (activity ? parseBringItems(activity) : []), [activity]);

  useEffect(() => {
    if (searchParams.get("request") === "1" && activity && activity.viewer_role === "viewer") {
      setJoinSheetOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [activity, searchParams, setSearchParams]);

  const orderedParticipants = useMemo(() => {
    if (!activity) return [];
    const hostId = activity.host.id;
    const fromApi = activity.participants ?? [];
    const hostEntry =
      fromApi.find((participant) => participant.id === hostId) ??
      ({ ...activity.host, is_host: true } as NonNullable<ActivityDetail["participants"]>[number]);
    const others = fromApi.filter((participant) => participant.id !== hostId);
    return [hostEntry, ...others];
  }, [activity]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <p className="text-on-surface-variant">Activity not found</p>
      </div>
    );
  }

  const canChat = activity.viewer_role === "host" || activity.viewer_role === "participant";
  const joinPending = activity.viewer_role === "requester";
  const isParticipant = activity.viewer_role === "participant";
  const filled = activity.participation_count;
  const capacity = activity.capacity;
  const emptySlots = capacity != null ? Math.max(0, capacity - orderedParticipants.length) : 0;

  const invalidateActivityQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["activity", id] }),
      queryClient.invalidateQueries({ queryKey: ["my-plans"] }),
      queryClient.invalidateQueries({ queryKey: ["my-chats"] }),
      queryClient.invalidateQueries({ queryKey: ["feed"] }),
    ]);
  };

  const join = async (introduction: string) => {
    setJoining(true);
    try {
      trackEvent("join_request_created", { activity_id: id, source: "detail" });
      await api.createJoinRequest({
        activity_id: id,
        introduction,
        availability_confirmed: true,
        idempotency_key: `join-${id}`,
      });
      setJoinSheetOpen(false);
      await invalidateActivityQueries();
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
      const updated = await api.getActivity(id);
      if (updated?.viewer_role === "participant" || updated?.viewer_role === "host") {
        navigate(`/activities/${id}/chat`);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not send join request");
    } finally {
      setJoining(false);
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

  const shareActivity = async () => {
    const url = activity.public_slug
      ? `${window.location.origin}/a/${activity.public_slug}`
      : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: activity.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        window.alert("Link copied to clipboard");
      }
    } catch {
      // user cancelled share sheet
    }
  };

  const isHost = activity.viewer_role === "host";
  const canManage = isHost && ["published", "draft"].includes(activity.status);

  const primaryAction = () => {
    if (activity.viewer_role === "host") return navigate("/host/requests");
    if (isParticipant) return leave();
    if (joinPending) return withdrawRequest();
    return setJoinSheetOpen(true);
  };

  const primaryLabel = () => {
    if (activity.viewer_role === "host") return "Manage requests";
    if (isParticipant) return leaving ? "Leaving..." : "Leave activity";
    if (joinPending) return leaving ? "Withdrawing..." : "Withdraw request";
    if (activity.is_full) return "Join waitlist";
    return "Request a place";
  };

  return (
    <div className="bg-background text-on-background antialiased min-h-dvh pb-28">
      <header className="w-full sticky top-0 bg-surface z-40 flex justify-between items-center px-margin-mobile py-2 h-16 border-b border-surface-container-high">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-2 -ml-2 rounded-full hover:bg-surface-container-high transition-colors btn-press"
        >
          <Icon name="arrow_back" />
        </button>
        <button
          type="button"
          aria-label="More options"
          className="p-2 rounded-full hover:bg-surface-container-high transition-colors btn-press"
          onClick={() => setOptionsOpen(true)}
        >
          <Icon name="more_vert" />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-margin-mobile pt-6">
        <Stagger className="space-y-0">
        {activity.cover_image_ref && (
          <StaggerItem className="mb-6 rounded-2xl overflow-hidden h-48 bg-surface-container-high">
            <img src={activity.cover_image_ref} alt="" className="w-full h-full object-cover" />
          </StaggerItem>
        )}

        <StaggerItem>
        <section className="mb-8">
          <div className="flex gap-2 mb-4 flex-wrap">
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full font-label-bold text-label-bold">
              {activity.category.name}
            </span>
            {capacity != null && capacity > 0 && (
              <span className="bg-surface-container-high text-on-surface-variant px-3 py-1 rounded-full font-label-bold text-label-bold">
                {capacityStatusLabel(filled, capacity)}
              </span>
            )}
          </div>

          <h1 className="font-headline-lg-mobile text-headline-lg-mobile mb-4 text-on-background">
            {activity.title}
          </h1>

          <div className="flex items-center gap-2 text-on-surface-variant mb-6">
            <Icon name="calendar_today" className="text-[18px]" />
            <span className="font-body-md text-body-md">{formatDetailWhen(activity.starts_at)}</span>
          </div>

          {capacity != null && capacity > 0 && (
            <div className="bg-surface-container rounded-lg p-4 mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="font-label-bold text-label-bold text-on-surface">Capacity</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant">
                  {filled} of {capacity} spaces filled
                </span>
              </div>
              <CapacitySegments filled={filled} total={capacity} className="h-3" />
            </div>
          )}
        </section>
        </StaggerItem>

        <StaggerItem>
        <section className="mb-8">
          <h2 className="font-headline-md text-headline-md mb-4 text-on-background">About this activity</h2>
          <p className="font-body-md text-body-md text-on-surface-variant whitespace-pre-line">
            {activity.description}
          </p>
        </section>
        </StaggerItem>

        <StaggerItem>
        <AboutHostSection activity={activity} />
        </StaggerItem>

        <StaggerItem>
        <section className="mb-8">
          <h2 className="font-headline-md text-headline-md mb-4 text-on-background">Meeting point</h2>
          {activity.location?.point ? (
            <ActivityMeetingMap
              lat={activity.location.point.lat}
              lng={activity.location.point.lng}
            />
          ) : (
            <div className="bg-surface-container rounded-xl overflow-hidden mb-3 h-48 w-full flex items-center justify-center text-on-surface-variant">
              <Icon name="map" className="text-4xl opacity-50" />
            </div>
          )}
          <div className="flex items-start gap-3 mt-3">
            <Icon name="location_on" className="text-primary mt-1" />
            <div>
              <h3 className="font-label-bold text-label-bold text-on-surface">
                {activity.location?.name ?? activity.area_label ?? "Meeting point"}
              </h3>
              <p className="font-body-md text-body-md text-on-surface-variant">
                {activity.location?.address_line ??
                  activity.location?.area_label ??
                  activity.area_label ??
                  "Details shared after you join."}
              </p>
            </div>
          </div>
        </section>
        </StaggerItem>

        {bringItems.length > 0 && (
          <StaggerItem>
          <section className="mb-8">
            <h2 className="font-headline-md text-headline-md mb-4 text-on-background">What to bring</h2>
            <ul className="flex flex-col gap-3">
              {bringItems.map((item) => (
                <li key={item.label} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                    <Icon name={item.icon} className="text-on-surface-variant" />
                  </div>
                  <span className="font-body-md text-body-md text-on-surface">{item.label}</span>
                </li>
              ))}
            </ul>
          </section>
          </StaggerItem>
        )}

        {capacity != null && (
          <StaggerItem>
          <section className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-headline-md text-headline-md text-on-background">
                Participants ({filled}/{capacity})
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {orderedParticipants.map((participant) => (
                <ParticipantAvatar
                  key={participant.id}
                  participant={participant}
                  isHost={participant.id === activity.host.id}
                />
              ))}
              {Array.from({ length: emptySlots }, (_, index) => (
                <div
                  key={`empty-${index}`}
                  className="w-12 h-12 rounded-full border border-dashed border-outline-variant"
                  aria-hidden
                />
              ))}
            </div>
          </section>
          </StaggerItem>
        )}

        {joinPending && (
          <StaggerItem>
          <p className="text-body-md text-on-surface-variant bg-surface-container rounded-xl p-4 mb-8">
            Your join request is pending. You can chat once the host accepts you.
          </p>
          </StaggerItem>
        )}
        </Stagger>
      </main>

      <FadeIn className="fixed bottom-0 w-full bg-surface border-t border-surface-container-high px-margin-mobile py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] z-50 flex items-center gap-4 safe-area-pb">
        <PrimaryButton
          fullWidth
          variant={
            isParticipant ? "danger" : activity.viewer_role === "host" ? "primary" : "primary"
          }
          disabled={
            leaving ||
            (activity.viewer_role !== "host" &&
              !isParticipant &&
              !joinPending &&
              !activity.is_joinable &&
              !activity.is_full)
          }
          onClick={primaryAction}
          className="flex-1 !rounded-full !h-12 !min-h-12 !py-0"
        >
          {primaryLabel()}
        </PrimaryButton>
        {canChat && (
          <button
            type="button"
            onClick={() => navigate(`/activities/${id}/chat`)}
            className="w-12 h-12 rounded-full border-2 border-surface-container-high flex items-center justify-center hover:bg-surface-container-low transition-colors text-on-surface-variant btn-press"
            aria-label="Open chat"
          >
            <Icon name="chat" />
          </button>
        )}
        <button
          type="button"
          onClick={shareActivity}
          className="w-12 h-12 rounded-full border-2 border-surface-container-high flex items-center justify-center hover:bg-surface-container-low transition-colors text-on-surface-variant btn-press"
          aria-label="Share activity"
        >
          <Icon name="share" />
        </button>
      </FadeIn>

      <ActivityOptionsSheet
        open={optionsOpen}
        isHost={isHost}
        onClose={() => setOptionsOpen(false)}
        onShare={shareActivity}
        onEdit={canManage ? () => navigate(`/activities/${id}/edit`) : undefined}
        onManageAttendees={canManage ? () => navigate(`/activities/${id}/attendees`) : undefined}
      />

      <JoinRequestSheet
        open={joinSheetOpen}
        activityTitle={activity.title}
        hostName={activity.host.display_name}
        isWaitlist={activity.is_full}
        loading={joining}
        onClose={() => setJoinSheetOpen(false)}
        onSubmit={join}
      />
    </div>
  );
}
