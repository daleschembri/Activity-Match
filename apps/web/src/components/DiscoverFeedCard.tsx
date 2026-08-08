import type { ActivitySummary } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";

interface DiscoverFeedCardProps {
  activity: ActivitySummary;
  onOpen: () => void;
}

/** Discover card with cover — lives in the web app so Vite HMR always picks it up. */
export function DiscoverFeedCard({ activity, onOpen }: DiscoverFeedCardProps) {
  const when = activity.starts_at
    ? new Date(activity.starts_at).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Flexible timing";

  const coverUrl = activity.cover_image_ref?.trim() || null;

  return (
    <article
      className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/20 overflow-hidden"
      aria-label={`${activity.title}, ${when}`}
    >
      <div className="relative w-full bg-surface-container-high" style={{ height: 220 }}>
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            loading="eager"
            decoding="async"
            style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            className="flex items-center justify-center text-on-surface-variant"
            style={{ width: "100%", height: "100%" }}
          >
            <Icon name="image" className="text-4xl opacity-60" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="px-3 py-1 bg-primary-container/90 text-on-primary-container text-label-sm font-label-bold rounded-full backdrop-blur-sm capitalize">
            {activity.listing_type}
          </span>
        </div>
      </div>

      <button type="button" onClick={onOpen} className="w-full text-left p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-headline-md font-bold">{activity.title}</h2>
          {activity.cost_amount > 0 ? (
            <span className="text-label-bold text-primary-container bg-primary-fixed px-2 py-1 rounded-lg shrink-0">
              {activity.cost_currency} {activity.cost_amount.toFixed(0)}
            </span>
          ) : (
            <span className="text-label-bold text-primary bg-primary-fixed px-2 py-1 rounded-lg shrink-0">
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
      </button>
    </article>
  );
}
