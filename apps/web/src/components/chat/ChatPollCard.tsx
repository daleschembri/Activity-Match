import { useMemo } from "react";
import type { ChatParticipant, ChatPollPayload } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";
import type { ChatMessage } from "@/lib/chatMessages";
import { formatMessageTime, senderDisplayName } from "@/lib/chatMessages";

interface ChatPollCardProps {
  message: ChatMessage;
  participants: ChatParticipant[];
  currentUserId: string | null;
  readOnly?: boolean;
  onVote?: (optionId: string) => void;
  voting?: boolean;
}

function voterAvatars(voterIds: string[], participants: ChatParticipant[]) {
  const byId = new Map(participants.map((p) => [p.id, p]));
  const voters = voterIds
    .map((id) => byId.get(id))
    .filter(Boolean) as ChatParticipant[];
  const visible = voters.slice(0, 3);
  const extra = voters.length - visible.length;
  return { visible, extra };
}

export function ChatPollCard({
  message,
  participants,
  currentUserId,
  readOnly,
  onVote,
  voting,
}: ChatPollCardProps) {
  const rawPayload = message.payload;
  const poll: ChatPollPayload =
    typeof rawPayload === "string"
      ? (JSON.parse(rawPayload) as ChatPollPayload)
      : (rawPayload as unknown as ChatPollPayload);
  const options = poll.options ?? [];
  const totalVotes = useMemo(
    () => options.reduce((sum, opt) => sum + (opt.votes?.length ?? 0), 0),
    [options],
  );
  const userVoteId = options.find((opt) => opt.votes?.includes(currentUserId ?? ""))?.id;

  return (
    <div className="flex gap-3 max-w-full mb-4">
      <div className="flex flex-col gap-2 w-full min-w-0">
        <div className="flex items-baseline gap-2 px-1">
          <span className="font-label-bold text-label-bold text-on-surface">
            {senderDisplayName(message)}
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            {formatMessageTime(message.created_at)}
          </span>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(28,28,26,0.04)] w-full">
          <div className="p-4 border-b border-surface-variant bg-surface-container-low/50 flex items-start gap-3">
            <Icon name="poll" filled className="text-primary mt-0.5" />
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-0.5">
                {poll.question || message.body}
              </h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                {poll.allow_multiple ? "Multiple choices allowed" : "Single choice"}
              </p>
            </div>
          </div>
          <div className="p-4 flex flex-col gap-3">
            {options.map((option) => {
              const voteCount = option.votes?.length ?? 0;
              const percent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const selected = userVoteId === option.id;
              const { visible, extra } = voterAvatars(option.votes ?? [], participants);

              return (
                <button
                  key={option.id}
                  type="button"
                  disabled={readOnly || voting}
                  onClick={() => onVote?.(option.id)}
                  className="relative group text-left w-full disabled:cursor-default"
                >
                  <div
                    className={`absolute inset-0 rounded-lg overflow-hidden border ${
                      selected ? "border-primary bg-primary-container/10" : "border-transparent bg-surface-container-highest"
                    }`}
                  >
                    {percent > 0 && (
                      <div
                        className="h-full bg-primary-container/25 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    )}
                  </div>
                  <div className="relative z-10 p-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                          selected ? "border-primary" : "border-outline-variant"
                        }`}
                      >
                        {selected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                      </div>
                      <span className="font-body-md text-on-surface font-medium truncate">
                        {option.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {visible.length > 0 && (
                        <div className="flex -space-x-2">
                          {visible.map((voter) =>
                            voter.avatar_ref ? (
                              <img
                                key={voter.id}
                                src={voter.avatar_ref}
                                alt=""
                                className="w-6 h-6 rounded-full border-2 border-surface-container-lowest object-cover"
                              />
                            ) : (
                              <div
                                key={voter.id}
                                className="w-6 h-6 rounded-full border-2 border-surface-container-lowest bg-surface-variant"
                              />
                            ),
                          )}
                          {extra > 0 && (
                            <div className="w-6 h-6 rounded-full border-2 border-surface-container-lowest bg-surface-variant flex items-center justify-center">
                              <span className="font-label-sm text-[10px] text-on-surface-variant">
                                +{extra}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <span
                        className={`font-label-sm text-label-sm w-10 text-right ${
                          selected ? "text-primary font-bold" : "text-on-surface-variant"
                        }`}
                      >
                        {percent}%
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2 bg-surface-container-low border-t border-surface-variant">
            <span className="font-label-sm text-label-sm text-on-surface-variant">
              {totalVotes} total vote{totalVotes === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
