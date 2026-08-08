import { useQuery } from "@tanstack/react-query";
import type { ActivitySummary } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";
import { CapacitySegments } from "@/components/CapacitySegments";
import { api } from "@/lib/api";

interface DiscoverFeedCardProps {
  activity: ActivitySummary;
  onOpen: () => void;
}

function formatDiscoverWhen(startsAt: string | null): string {
  if (!startsAt) return "Flexible timing";
  const date = new Date(startsAt);
  return date.toLocaleString(undefined, {
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocation(activity: ActivitySummary): string {
  const area = activity.area_label ?? "Location TBD";
  if (activity.distance_from_viewer_minutes != null) {
    return `${area}, ${activity.distance_from_viewer_minutes} min away`;
  }
  return area;
}

function listingTypeLabel(listingType: ActivitySummary["listing_type"]): string {
  if (listingType === "confirmed") return "Confirmed";
  if (listingType === "proposed") return "Proposed";
  return "Idea";
}

function skillTag(skillLevel: ActivitySummary["skill_level"]): string | null {
  if (skillLevel === "beginner") return "Beginner-friendly";
  if (skillLevel === "intermediate") return "Intermediate";
  if (skillLevel === "advanced") return "Advanced";
  return null;
}

function hostInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function HostReliability({ userId }: { userId: string }) {
  const { data: reliability } = useQuery({
    queryKey: ["reliability", userId],
    queryFn: () => api.getReliability(userId),
    enabled: Boolean(userId),
  });

  const isEstablished = reliability?.label !== "New to the platform";

  return (
    <p className="font-label-sm text-label-sm text-primary flex items-center gap-1">
      {isEstablished && <Icon name="verified" className="text-[14px]" />}
      {isEstablished ? "High Reliability" : "New host"}
    </p>
  );
}

/** Discover card matching stitch/action-deck/discover-activities */
export function DiscoverFeedCard({ activity, onOpen }: DiscoverFeedCardProps) {
  const when = formatDiscoverWhen(activity.starts_at);
  const location = formatLocation(activity);
  const coverUrl = activity.cover_image_ref?.trim() || null;
  const skill = skillTag(activity.skill_level);
  const filled = activity.participation_count;
  const capacity = activity.capacity;

  return (
    <article
      className="relative z-10 w-full max-w-md bg-surface-container-lowest rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col h-[min(601px,72dvh)] border border-surface-container"
      aria-label={`${activity.title}, ${when}`}
    >
      <div className="relative h-[45%] w-full bg-surface-container-high shrink-0">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
            <Icon name="image" className="text-5xl opacity-50" />
          </div>
        )}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-primary-container text-on-primary-container font-label-bold text-label-sm rounded-full bg-opacity-90 backdrop-blur-sm shadow-sm flex items-center gap-1">
            {activity.listing_type === "confirmed" && (
              <Icon name="check_circle" filled className="text-[16px] leading-none" />
            )}
            {listingTypeLabel(activity.listing_type)}
          </span>
          <span className="px-3 py-1 bg-surface-container-highest text-on-surface font-label-bold text-label-sm rounded-full bg-opacity-90 backdrop-blur-sm shadow-sm">
            One-off
          </span>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1 bg-surface-container-lowest min-h-0">
        <div className="mb-4">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-2">{activity.title}</h2>
          <div className="flex flex-col gap-1 text-on-surface-variant font-body-md text-body-md">
            <div className="flex items-center gap-2">
              <Icon name="calendar_month" className="text-[18px]" />
              <span>{when}</span>
            </div>
            <div className="flex items-center gap-2">
              <Icon name="location_on" className="text-[18px]" />
              <span>{location}</span>
            </div>
          </div>
        </div>

        {capacity != null && capacity > 0 && (
          <div className="mb-5">
            <div className="flex justify-between items-end mb-2">
              <span className="font-label-bold text-label-bold text-on-surface">Capacity</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {filled} of {capacity} spaces filled
              </span>
            </div>
            <CapacitySegments filled={filled} total={capacity} />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-auto">
          {skill && (
            <span className="px-3 py-1 bg-secondary/10 text-secondary font-label-sm text-label-sm rounded-full">
              {skill}
            </span>
          )}
          <span className="px-3 py-1 bg-primary/10 text-primary font-label-sm text-label-sm rounded-full">
            {activity.cost_amount > 0
              ? `${activity.cost_currency} ${activity.cost_amount.toFixed(0)}`
              : "Free"}
          </span>
        </div>

        <hr className="border-outline-variant/30 my-4" />

        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-3 min-w-0">
            {activity.host.avatar_ref ? (
              <img
                src={activity.host.avatar_ref}
                alt=""
                className="w-10 h-10 rounded-full object-cover border border-outline-variant/20 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-label-sm font-bold text-on-surface-variant shrink-0">
                {hostInitials(activity.host.display_name)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-label-bold text-label-bold text-on-surface truncate">
                {activity.host.display_name}
              </p>
              <HostReliability userId={activity.host.id} />
            </div>
          </div>
          <button
            type="button"
            onClick={onOpen}
            className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors shrink-0 btn-press"
            aria-label="View activity details"
          >
            <Icon name="more_horiz" className="text-[18px]" />
          </button>
        </div>
      </div>
    </article>
  );
}
