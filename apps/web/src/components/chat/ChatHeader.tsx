import type { ChatParticipant } from "@activity-match/shared";
import type { ActivityDetail } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";
import { senderInitials } from "@/lib/chatMessages";

interface ChatHeaderProps {
  activity: ActivityDetail;
  participants: ChatParticipant[];
  isReadOnly?: boolean;
  onBack: () => void;
  onMore?: () => void;
}

function ParticipantStack({ participants }: { participants: ChatParticipant[] }) {
  const visible = participants.slice(0, 3);
  const extra = participants.length - visible.length;

  return (
    <div className="flex -space-x-2 mt-1">
      {visible.map((p) =>
        p.avatar_ref ? (
          <img
            key={p.id}
            src={p.avatar_ref}
            alt=""
            className="w-6 h-6 rounded-full border-2 border-surface object-cover"
          />
        ) : (
          <div
            key={p.id}
            className="w-6 h-6 rounded-full border-2 border-surface bg-surface-container-highest flex items-center justify-center text-[10px] font-bold text-on-surface-variant"
          >
            {senderInitials(p.display_name)}
          </div>
        ),
      )}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full border-2 border-surface bg-surface-container-highest flex items-center justify-center font-label-sm text-label-sm text-on-surface-variant">
          +{extra}
        </div>
      )}
    </div>
  );
}

export function ChatHeader({ activity, participants, isReadOnly, onBack, onMore }: ChatHeaderProps) {
  const eventDate = activity.starts_at
    ? new Date(activity.starts_at).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <header className="sticky top-0 z-20 bg-surface border-b border-surface-variant shrink-0">
      <div className="flex justify-between items-center px-margin-mobile py-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onBack}
            aria-label="Go back"
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high"
          >
            <Icon name="arrow_back" />
          </button>
          <div className="min-w-0">
            <h1 className="text-headline-md font-bold text-primary truncate">{activity.title}</h1>
            {isReadOnly && eventDate ? (
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <Icon name="calendar_today" className="text-sm" />
                {eventDate}
              </span>
            ) : (
              <ParticipantStack participants={participants} />
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onMore ?? onBack}
          aria-label="More options"
          className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high shrink-0"
        >
          <Icon name="more_vert" />
        </button>
      </div>
    </header>
  );
}
