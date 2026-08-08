import type { ActivitySummary } from "@activity-match/shared";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface ActivityCardProps {
  activity: ActivitySummary;
  onOpen?: () => void;
  actions?: ReactNode;
  variant?: "compact" | "hero";
}

export function ActivityCard({ activity, onOpen, actions, variant = "compact" }: ActivityCardProps) {
  const when = activity.starts_at
    ? new Date(activity.starts_at).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Flexible timing";

  const isHero = variant === "hero";
  const coverUrl = activity.cover_image_ref?.trim() || null;

  return (
    <article
      className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden"
      aria-label={`${activity.title}, ${when}`}
    >
      {isHero && (
        <div className="relative aspect-[16/10] min-h-44 w-full shrink-0 bg-surface-container-high">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              loading="eager"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-on-surface-variant">
              <Icon name="image" className="text-4xl opacity-60" />
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <span className="px-3 py-1 bg-primary-container/90 text-on-primary-container text-label-sm font-label-bold rounded-full backdrop-blur-sm capitalize">
              {activity.listing_type}
            </span>
          </div>
        </div>
      )}
      <button type="button" onClick={onOpen} className="w-full text-left p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            {!isHero && (
              <p className="text-label-sm uppercase text-on-surface-variant tracking-wide">
                {activity.category.name} · {activity.listing_type}
              </p>
            )}
            <h2 className="text-headline-md font-bold mt-1">{activity.title}</h2>
          </div>
          {activity.cost_amount > 0 ? (
            <span className="text-label-bold text-primary-container bg-primary-fixed px-2 py-1 rounded-lg">
              {activity.cost_currency} {activity.cost_amount.toFixed(0)}
            </span>
          ) : (
            <span className="text-label-bold text-primary bg-primary-fixed px-2 py-1 rounded-lg">
              Free
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-body-md text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <Icon name="schedule" className="text-base" />
            {when}
          </span>
          {activity.area_label && (
            <span className="inline-flex items-center gap-1">
              <Icon name="location_on" className="text-base" />
              {activity.area_label}
              {activity.distance_from_viewer_minutes != null &&
                ` · ${activity.distance_from_viewer_minutes} min`}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-body-md text-on-surface-variant">
            Hosted by {activity.host.display_name}
          </span>
          {activity.capacity != null && (
            <span
              className={`text-label-bold px-2 py-1 rounded-full ${
                activity.is_full
                  ? "bg-error-container text-on-error-container"
                  : "bg-primary-fixed text-on-primary-fixed"
              }`}
            >
              {activity.is_full
                ? "Full"
                : `${activity.spaces_remaining} of ${activity.capacity} left`}
            </span>
          )}
        </div>
        {activity.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activity.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-label-sm bg-surface-container px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>
      {actions && <div className="px-4 pb-4 flex gap-2">{actions}</div>}
    </article>
  );
}
