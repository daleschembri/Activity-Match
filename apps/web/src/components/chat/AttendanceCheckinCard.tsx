import type { AttendanceCheckinParticipant, AttendanceCheckinStatus } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";
import type { ChatMessage } from "@/lib/chatMessages";
import { senderInitials } from "@/lib/chatMessages";

interface AttendanceCheckinCardProps {
  message: ChatMessage;
  checkinStatus?: AttendanceCheckinStatus | null;
  readOnly?: boolean;
  loading?: boolean;
  onConfirm?: () => void;
  onDecline?: () => void;
}

function formatConfirmBy(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function ParticipantRow({
  participant,
  checkedIn,
}: {
  participant: AttendanceCheckinParticipant;
  checkedIn: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      {participant.avatar_ref ? (
        <img src={participant.avatar_ref} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-surface-container-highest flex items-center justify-center text-label-sm font-bold shrink-0">
          {senderInitials(participant.display_name)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-label-bold text-label-bold text-on-surface truncate">
          {participant.display_name}
        </p>
        <p className={`font-label-sm text-label-sm ${checkedIn ? "text-primary" : "text-on-surface-variant"}`}>
          {checkedIn ? "Checked in" : "No response yet"}
        </p>
      </div>
      {checkedIn ? (
        <Icon name="check_circle" filled className="text-primary shrink-0" />
      ) : (
        <Icon name="schedule" className="text-outline shrink-0" />
      )}
    </div>
  );
}

function HostCheckinPanel({ checkinStatus }: { checkinStatus: AttendanceCheckinStatus }) {
  const attendees = checkinStatus.participants.filter((p) => !p.is_host);
  const checkedIn = attendees.filter((p) => p.attendance_confirmed_at);
  const pending = attendees.filter((p) => !p.attendance_confirmed_at);

  return (
    <div className="mt-4 space-y-4 text-left">
      <div className="flex items-center justify-between">
        <p className="font-label-bold text-label-bold text-on-surface">Participant check-ins</p>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          {checkedIn.length}/{attendees.length} confirmed
        </span>
      </div>

      {checkedIn.length > 0 && (
        <div className="bg-primary-container/10 border border-primary/20 rounded-xl px-3 py-1">
          <p className="font-label-sm text-label-sm text-primary font-bold px-1 pt-2 pb-1">
            Checked in ({checkedIn.length})
          </p>
          {checkedIn.map((participant) => (
            <ParticipantRow key={participant.user_id} participant={participant} checkedIn />
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <div className="bg-surface-container-low border border-surface-variant rounded-xl px-3 py-1">
          <p className="font-label-sm text-label-sm text-on-surface-variant font-bold px-1 pt-2 pb-1">
            Waiting on response ({pending.length})
          </p>
          {pending.map((participant) => (
            <ParticipantRow key={participant.user_id} participant={participant} checkedIn={false} />
          ))}
        </div>
      )}

      {attendees.length === 0 && (
        <p className="font-body-md text-body-md text-on-surface-variant text-center py-2">
          No confirmed participants yet.
        </p>
      )}
    </div>
  );
}

export function AttendanceCheckinCard({
  message,
  checkinStatus,
  readOnly,
  loading,
  onConfirm,
  onDecline,
}: AttendanceCheckinCardProps) {
  const confirmBy = formatConfirmBy(
    (message.payload.confirm_by as string | undefined) ?? checkinStatus?.confirm_by ?? null,
  );
  const isHost = Boolean(checkinStatus?.viewer_is_host);
  const viewerConfirmed = Boolean(checkinStatus?.viewer_confirmed_at);
  const canRespond = Boolean(checkinStatus?.viewer_can_respond && !readOnly);

  return (
    <div className="flex justify-center mb-4">
      <div className="bg-surface border border-primary/20 rounded-xl p-4 max-w-[95%] w-full shadow-[0_4px_12px_rgba(0,0,0,0.03)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <div className={`flex flex-col ${isHost ? "items-start text-left" : "items-center text-center"}`}>
          <div className={`flex items-center gap-2 mb-2 ${isHost ? "" : "flex-col"}`}>
            <Icon name="event_available" className="text-primary text-2xl" />
            <p className="font-headline-md text-headline-md text-on-surface">
              {isHost ? "Attendance check-in" : message.body}
            </p>
          </div>
          {!isHost && (
            <p className="font-body-md text-body-md text-on-surface whitespace-pre-line leading-relaxed">
              {message.body}
            </p>
          )}
          {isHost && (
            <p className="font-body-md text-body-md text-on-surface-variant">
              See who has confirmed they&apos;re still coming.
            </p>
          )}
          {confirmBy && (
            <p className={`font-label-bold text-label-bold text-primary mt-2 ${isHost ? "" : ""}`}>
              {isHost
                ? `Responses due by ${confirmBy}`
                : `Please confirm attendance by ${confirmBy}.`}
            </p>
          )}
        </div>

        {isHost && checkinStatus ? (
          <HostCheckinPanel checkinStatus={checkinStatus} />
        ) : null}

        {!isHost && !readOnly && (
          <div className="mt-4 bg-surface-container-low rounded-lg p-3 border border-surface-variant w-full">
            {viewerConfirmed ? (
              <p className="font-label-bold text-label-bold text-primary text-center flex items-center justify-center gap-1">
                <Icon name="check_circle" filled />
                You&apos;re confirmed for this activity
              </p>
            ) : canRespond ? (
              <>
                <p className="font-label-bold text-label-bold text-on-surface mb-3 text-center">
                  Confirming attendance?
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onConfirm}
                    className="flex-1 bg-primary text-on-primary font-label-bold text-label-bold py-2.5 rounded-full flex items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Icon name="check" className="text-base" />
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={onDecline}
                    className="flex-1 bg-surface-container-high border border-outline-variant text-on-surface font-label-bold text-label-bold py-2.5 rounded-full flex items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50"
                  >
                    <Icon name="close" className="text-base" />
                    No
                  </button>
                </div>
              </>
            ) : checkinStatus?.within_window ? (
              <p className="font-label-sm text-label-sm text-on-surface-variant text-center">
                Only confirmed participants can check in here.
              </p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
