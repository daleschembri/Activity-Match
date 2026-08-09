import { useState } from "react";
import type { ActivityDetail, ChatParticipant } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";
import { formatSessionChip } from "@/lib/chatList";

interface PinnedActivityCardProps {
  activity: ActivityDetail;
  participants?: ChatParticipant[];
  variant?: "active" | "archived";
}

function formatSessionRange(activity: ActivityDetail): string {
  if (!activity.starts_at) return "Flexible timing";
  const start = formatSessionChip(activity.starts_at);
  if (!start || !activity.duration_minutes) return start ?? "Flexible timing";
  const end = new Date(new Date(activity.starts_at).getTime() + activity.duration_minutes * 60_000);
  const endTime = end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const startTime = new Date(activity.starts_at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayPart = start.replace(/\s\d{1,2}:\d{2}$/, "");
  if (dayPart === start) return `${start} – ${endTime}`;
  return `${dayPart}, ${startTime} – ${endTime}`;
}

export function PinnedActivityCard({ activity, participants = [], variant = "active" }: PinnedActivityCardProps) {
  const [view, setView] = useState<"compressed" | "expanded">("compressed");
  const when = activity.starts_at
    ? formatSessionChip(activity.starts_at)?.replace(/^Today /, "Today, ").replace(/^Tomorrow /, "Tomorrow, ")
    : "Flexible timing";
  const sessionRange = formatSessionRange(activity);
  const cost =
    activity.cost_amount > 0
      ? `${activity.cost_currency} ${activity.cost_amount.toFixed(0)}`
      : "Free";
  const spacesLeft =
    activity.capacity != null
      ? `${Math.max(0, activity.capacity - activity.participation_count)} spaces left`
      : null;
  const locationName = activity.location?.name ?? activity.area_label ?? activity.title;

  if (variant === "archived") {
    return (
      <div className="px-margin-mobile py-4 bg-surface shadow-[0_4px_20px_rgba(28,28,26,0.06)] shrink-0">
        <div className="flex justify-between items-start mb-3">
          <div>
            <span className="inline-flex items-center gap-1 bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full font-label-bold text-label-sm mb-2">
              <Icon name="check_circle" className="text-sm" />
              Completed
            </span>
            <h2 className="text-headline-md font-bold text-on-surface">{locationName}</h2>
          </div>
        </div>
        {participants.length > 0 && (
          <div className="flex items-center justify-between border-t border-surface-container pt-3">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Attendees</span>
            <div className="flex -space-x-2">
              {participants.slice(0, 4).map((p) =>
                p.avatar_ref ? (
                  <img
                    key={p.id}
                    src={p.avatar_ref}
                    alt=""
                    className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                  />
                ) : (
                  <div
                    key={p.id}
                    className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-highest"
                  />
                ),
              )}
              {participants.length > 4 && (
                <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-highest flex items-center justify-center text-label-sm">
                  +{participants.length - 4}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === "compressed") {
    return (
      <div className="px-margin-mobile py-2 bg-surface border-b border-surface-variant shrink-0">
        <button
          type="button"
          onClick={() => setView("expanded")}
          className="w-full flex items-center gap-4 bg-surface-container-low p-4 rounded-lg hover:bg-surface-container-high transition-colors text-left"
        >
          <div className="w-12 h-12 rounded-md bg-primary-container/20 flex items-center justify-center text-primary shrink-0">
            <Icon name="calendar_month" filled />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider mb-0.5">
              Next session
            </p>
            <h3 className="font-label-bold text-label-bold text-on-surface truncate">{locationName}</h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant truncate">{sessionRange}</p>
          </div>
          <Icon name="expand_more" className="text-on-surface-variant shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div className="px-margin-mobile pt-2 pb-4 bg-surface border-b border-surface-variant shadow-[0_4px_12px_rgba(0,0,0,0.02)] shrink-0">
      <div className="bg-surface-container-low rounded-lg p-4 border border-surface-variant/50">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 text-primary">
            <Icon name="push_pin" filled className="text-[20px]" />
            <span className="font-label-bold text-label-bold uppercase tracking-wider text-xs">
              Pinned Activity
            </span>
          </div>
          <button
            type="button"
            onClick={() => setView("compressed")}
            aria-label="Compress"
            className="text-on-surface-variant hover:text-primary"
          >
            <Icon name="expand_less" />
          </button>
        </div>
        <h2 className="text-headline-md font-bold text-on-surface mb-2">{locationName}</h2>
        <div className="grid grid-cols-2 gap-2 text-on-surface-variant font-label-bold text-label-bold">
          <div className="flex items-center gap-1">
            <Icon name="calendar_month" className="text-[18px]" />
            <span>{when}</span>
          </div>
          <div className="flex items-center gap-1">
            <Icon name="payments" className="text-[18px]" />
            <span>{cost}</span>
          </div>
          {spacesLeft && (
            <div className="flex items-center gap-1 col-span-2 mt-1">
              <Icon name="group" className="text-[18px]" />
              <span>{spacesLeft}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
