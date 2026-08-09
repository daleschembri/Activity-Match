import { useQuery } from "@tanstack/react-query";
import type { ActivitySummary } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";
import { CapacitySegments } from "@/components/CapacitySegments";
import { api } from "@/lib/api";

interface DiscoverFeedCardProps {
  activity: ActivitySummary;
  onOpen: () => void;
  className?: string;
}

function formatDiscoverWhen(startsAt: string | null): string {
  if (!startsAt) return "Flexible timing";
  const date = new Date(startsAt);
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLocationBadge(activity: ActivitySummary): string {
  const area = activity.area_label ?? "Location TBD";
  if (activity.distance_from_viewer_minutes != null) {
    return `${area} · ${activity.distance_from_viewer_minutes} min`;
  }
  return area;
}

function formatCostBadge(activity: ActivitySummary): string {
  if (activity.cost_amount > 0) {
    return `${activity.cost_currency} ${activity.cost_amount.toFixed(0)}`;
  }
  return "Free";
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
    <p className="font-label-sm text-label-sm text-primary flex items-center gap-1 truncate">
      {isEstablished && <Icon name="verified" className="text-[14px] shrink-0" />}
      <span className="truncate">{isEstablished ? "High Reliability" : "New host"}</span>
    </p>
  );
}

/** Discover card matching stitch/action-deck/discover-activities */
export function DiscoverFeedCard({ activity, onOpen, className = "" }: DiscoverFeedCardProps) {
  const when = formatDiscoverWhen(activity.starts_at);
  const locationBadge = formatLocationBadge(activity);
  const costBadge = formatCostBadge(activity);
  const isFree = activity.cost_amount <= 0;
  const coverUrl = activity.cover_image_ref?.trim() || null;
  const skill = skillTag(activity.skill_level);
  const filled = activity.participation_count;
  const capacity = activity.capacity;

  return (
    <article
      className={`relative z-10 w-full bg-surface-container-lowest rounded-[24px] shadow-[0_8px_24px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col min-h-0 h-full border border-surface-container ${className}`}
      aria-label={`${activity.title}, ${when}, ${locationBadge}`}
    >
      <div className="relative h-[38%] min-h-[128px] max-h-[200px] w-full bg-surface-container-high shrink-0">
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
        <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2">
          <span className="max-w-full px-3 py-1 bg-surface-container-highest/95 text-on-surface font-label-bold text-label-sm rounded-full backdrop-blur-sm shadow-sm flex items-center gap-1 min-w-0">
            <Icon name="location_on" className="text-[16px] leading-none shrink-0" />
            <span className="truncate">{locationBadge}</span>
          </span>
          <span
            className={`px-3 py-1 font-label-bold text-label-sm rounded-full backdrop-blur-sm shadow-sm shrink-0 ${
              isFree
                ? "bg-primary-fixed/95 text-on-primary-fixed"
                : "bg-secondary-fixed/95 text-on-secondary-container"
            }`}
          >
            {costBadge}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 bg-surface-container-lowest min-h-0 overflow-hidden">
        <div className="mb-3 min-w-0">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-1.5 line-clamp-2">
            {activity.title}
          </h2>
          <div className="flex items-center gap-2 text-on-surface-variant font-body-md text-body-md min-w-0">
            <Icon name="calendar_month" className="text-[18px] shrink-0" />
            <span className="truncate">{when}</span>
            {skill && (
              <>
                <span className="text-outline-variant shrink-0">·</span>
                <span className="truncate text-label-sm">{skill}</span>
              </>
            )}
          </div>
        </div>

        {capacity != null && capacity > 0 && (
          <div className="mb-3">
            <div className="flex justify-between items-center gap-2 mb-1.5">
              <span className="font-label-bold text-label-bold text-on-surface shrink-0">Capacity</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant text-right truncate">
                {activity.is_full ? "Full — join waitlist" : `${filled} of ${capacity} filled`}
              </span>
            </div>
            <CapacitySegments filled={filled} total={capacity} className="h-2" />
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mt-auto pt-3 border-t border-outline-variant/30 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {activity.host.avatar_ref ? (
              <img
                src={activity.host.avatar_ref}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-outline-variant/20 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-surface-container-highest border border-outline-variant/20 flex items-center justify-center text-label-sm font-bold text-on-surface-variant shrink-0">
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
