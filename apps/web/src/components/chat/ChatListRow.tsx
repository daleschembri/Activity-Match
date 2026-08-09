import type { ChatSummary } from "@activity-match/shared";
import { Icon } from "@activity-match/ui";
import { UnreadBadge } from "@/components/UnreadBadge";
import {
  chatIconForCategory,
  chatPreviewText,
  formatChatListTime,
  formatSessionChip,
  isArchivedChat,
} from "@/lib/chatList";

interface ChatListRowProps {
  chat: ChatSummary;
  onClick: () => void;
}

export function ChatListRow({ chat, onClick }: ChatListRowProps) {
  const archived = isArchivedChat(chat);
  const preview = chatPreviewText(chat);
  const listTime = formatChatListTime(chat.last_message?.created_at ?? chat.starts_at);
  const sessionChip = formatSessionChip(chat.starts_at);
  const icon = chatIconForCategory(chat.category?.name);
  const showUnread = !archived && chat.unread_count > 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl p-4 flex gap-3 items-stretch shadow-[0_4px_12px_rgba(0,0,0,0.04)] active:scale-[0.98] transition-transform ${
        archived
          ? "bg-surface-container-low opacity-90"
          : chat.unread_count > 0
            ? "bg-surface-container-lowest border border-primary/20"
            : "bg-surface-container-lowest"
      }`}
    >
      <div
        className={`w-14 h-14 rounded-lg flex items-center justify-center shrink-0 self-center ${
          archived ? "bg-surface-variant" : "bg-tertiary-container/10"
        }`}
      >
        <Icon
          name={icon}
          className={`text-2xl ${archived ? "text-outline" : "text-tertiary"}`}
        />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1 py-0.5">
        <h3
          className={`font-label-bold text-label-bold truncate leading-6 ${
            archived ? "text-on-surface-variant" : "text-on-surface"
          }`}
        >
          {chat.title}
        </h3>
        <p
          className={`font-body-md text-body-md truncate leading-6 ${
            archived ? "text-outline italic" : "text-on-surface-variant"
          }`}
        >
          {preview}
        </p>
      </div>

      <div className="flex flex-col justify-center items-end gap-1.5 shrink-0 text-right py-0.5 min-w-[5rem]">
        <div className="flex items-center justify-end gap-1.5 min-h-6">
          {listTime ? (
            <span
              className={`font-label-sm text-label-sm leading-none whitespace-nowrap tabular-nums ${
                archived ? "text-outline" : "text-primary"
              }`}
            >
              {listTime}
            </span>
          ) : null}
          {showUnread ? <UnreadBadge count={chat.unread_count} variant="primary" /> : null}
        </div>
        {archived ? (
          <span className="bg-surface-variant text-outline font-label-sm text-label-sm leading-none px-2 py-1 rounded-full border border-outline-variant whitespace-nowrap">
            Archived
          </span>
        ) : sessionChip ? (
          <span className="bg-secondary-container/10 text-secondary font-label-sm text-label-sm leading-none px-2 py-1 rounded-full whitespace-nowrap tabular-nums">
            {sessionChip}
          </span>
        ) : null}
      </div>
    </button>
  );
}
