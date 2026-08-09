import { motion } from "framer-motion";
import { Icon } from "@activity-match/ui";
import type { AttendanceCheckinStatus } from "@activity-match/shared";
import { AttendanceCheckinCard } from "@/components/chat/AttendanceCheckinCard";
import { ChatDateDivider } from "@/components/chat/ChatDateDivider";
import { ChatPollCard } from "@/components/chat/ChatPollCard";
import type { ChatDisplayItem, ChatMessage } from "@/lib/chatMessages";
import {
  formatBubbleMeta,
  formatSystemMessageBody,
  senderDisplayName,
  senderInitials,
  systemMessageIcon,
} from "@/lib/chatMessages";
import { messageIn } from "@/lib/motion";

interface ChatMessageListProps {
  items: ChatDisplayItem[];
  participants?: import("@activity-match/shared").ChatParticipant[];
  currentUserId?: string | null;
  readOnly?: boolean;
  onVotePoll?: (messageId: string, optionId: string) => void;
  votingPollId?: string | null;
  checkinStatus?: AttendanceCheckinStatus | null;
  checkinLoading?: boolean;
  onConfirmCheckin?: () => void;
  onDeclineCheckin?: () => void;
  muted?: boolean;
}

function ChatAvatar({ message, size = "md" }: { message: ChatMessage; size?: "sm" | "md" }) {
  const name = senderDisplayName(message);
  const avatarRef = message.sender?.avatar_ref;
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";

  if (avatarRef) {
    return (
      <img
        src={avatarRef}
        alt=""
        className={`${dim} rounded-full object-cover shrink-0 bg-surface-container mt-auto`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full shrink-0 bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-label-sm font-bold mt-auto`}
      aria-hidden
    >
      {senderInitials(name)}
    </div>
  );
}

function SystemMessageCard({
  message,
  participants = [],
  checkinStatus,
  readOnly,
  checkinLoading,
  onConfirmCheckin,
  onDeclineCheckin,
}: {
  message: ChatMessage;
  participants?: import("@activity-match/shared").ChatParticipant[];
  checkinStatus?: AttendanceCheckinStatus | null;
  readOnly?: boolean;
  checkinLoading?: boolean;
  onConfirmCheckin?: () => void;
  onDeclineCheckin?: () => void;
}) {
  const systemType = (message.payload.system_type as string) ?? "info";
  const body = formatSystemMessageBody(message, participants);
  const icon = systemMessageIcon(systemType);
  const isAttendance = systemType === "attendance_request";
  const isDeadlineReminder = systemType === "deadline_reminder";

  if (isAttendance) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} layout>
        <AttendanceCheckinCard
          message={message}
          checkinStatus={checkinStatus}
          readOnly={readOnly}
          loading={checkinLoading}
          onConfirm={onConfirmCheckin}
          onDecline={onDeclineCheckin}
        />
      </motion.div>
    );
  }

  if (isDeadlineReminder) {
    return (
      <motion.div
        className="flex justify-center mb-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <div className="bg-surface-container text-on-surface rounded-xl p-4 max-w-[90%] border border-surface-variant flex items-start gap-3 shadow-sm">
          <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center shrink-0">
            <Icon name="info" className="text-base text-on-primary-container" />
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">
            {body}
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="flex justify-center mb-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className="bg-surface-container text-on-surface rounded-xl p-4 max-w-[90%] border border-surface-variant flex items-start gap-3 shadow-sm">
        <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center shrink-0">
          <Icon name={icon} className="text-base text-on-primary-container" />
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">
          {body}
        </p>
      </div>
    </motion.div>
  );
}

function IncomingMessageGroup({ messages, muted }: { messages: ChatMessage[]; muted?: boolean }) {
  const lastMessage = messages[messages.length - 1];

  return (
    <motion.div
      className="flex gap-3 max-w-[85%] mb-4"
      variants={messageIn}
      initial="hidden"
      animate="show"
      layout
    >
      <ChatAvatar message={messages[0]} />
      <div className="flex flex-col gap-1 min-w-0">
        <span className="font-label-sm text-label-sm text-on-surface-variant ml-1">
          {formatBubbleMeta(lastMessage, false)}
        </span>
        <div
          className={`rounded-xl rounded-bl-none p-3 shadow-sm font-body-md text-body-md ${
            muted
              ? "bg-surface-container text-on-surface"
              : "bg-surface-container-high text-on-surface"
          }`}
        >
          {messages.map((message) => (
            <p key={message.id} className={messages.length > 1 ? "mb-1 last:mb-0" : ""}>
              {message.body}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function OutgoingMessageGroup({ messages, muted }: { messages: ChatMessage[]; muted?: boolean }) {
  const lastMessage = messages[messages.length - 1];

  return (
    <motion.div
      className="flex gap-3 max-w-[85%] mb-4 self-end flex-row-reverse"
      variants={messageIn}
      initial="hidden"
      animate="show"
      layout
    >
      <div className="flex flex-col gap-1 items-end min-w-0">
        <span className="font-label-sm text-label-sm text-on-surface-variant mr-1">
          {formatBubbleMeta(lastMessage, true)}
        </span>
        <div
          className={`rounded-xl rounded-br-none p-3 shadow-sm font-body-md text-body-md ${
            muted ? "bg-surface-tint text-on-primary" : "bg-primary text-on-primary"
          }`}
        >
          {messages.map((message) => (
            <p key={message.id} className={messages.length > 1 ? "mb-1 last:mb-0" : ""}>
              {message.body}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatMessageList({
  items,
  participants = [],
  currentUserId = null,
  readOnly,
  onVotePoll,
  votingPollId,
  checkinStatus,
  checkinLoading,
  onConfirmCheckin,
  onDeclineCheckin,
  muted,
}: ChatMessageListProps) {
  return (
    <div className={`flex flex-col ${muted ? "opacity-90" : ""}`}>
      {items.map((item) => {
        if (item.kind === "date") {
          return <ChatDateDivider key={`date-${item.key}`} label={item.label} />;
        }

        if (item.kind === "system") {
          return (
            <SystemMessageCard
              key={item.message.id}
              message={item.message as ChatMessage}
              participants={participants}
              checkinStatus={checkinStatus}
              readOnly={readOnly}
              checkinLoading={checkinLoading}
              onConfirmCheckin={onConfirmCheckin}
              onDeclineCheckin={onDeclineCheckin}
            />
          );
        }

        if (item.kind === "poll") {
          return (
            <ChatPollCard
              key={item.message.id}
              message={item.message}
              participants={participants}
              currentUserId={currentUserId}
              readOnly={readOnly}
              onVote={(optionId) => onVotePoll?.(item.message.id, optionId)}
              voting={votingPollId === item.message.id}
            />
          );
        }

        if (item.isMine) {
          return (
            <OutgoingMessageGroup key={item.messages[0].id} messages={item.messages} muted={muted} />
          );
        }

        return (
          <IncomingMessageGroup key={item.messages[0].id} messages={item.messages} muted={muted} />
        );
      })}
    </div>
  );
}
