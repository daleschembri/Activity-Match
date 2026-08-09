import type { Message } from "@activity-match/shared";

export interface ChatMessage extends Message {
  sender?: {
    id: string;
    display_name: string;
    avatar_ref: string | null;
  } | null;
}

export type ChatDisplayItem =
  | { kind: "date"; label: string; key: string }
  | { kind: "system"; message: Message }
  | { kind: "poll"; message: ChatMessage; isMine: boolean }
  | { kind: "group"; senderId: string | null; messages: ChatMessage[]; isMine: boolean };

const GROUP_WINDOW_MS = 5 * 60 * 1000;

function dateDividerLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (dayDiff === 0) return "Today";
  if (dayDiff === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function dateKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export function groupChatMessages(messages: ChatMessage[], currentUserId: string | null): ChatDisplayItem[] {
  const items: ChatDisplayItem[] = [];
  let lastDateKey: string | null = null;

  for (const message of messages) {
    const messageDateKey = dateKey(message.created_at);
    if (messageDateKey !== lastDateKey) {
      items.push({
        kind: "date",
        label: dateDividerLabel(message.created_at),
        key: messageDateKey,
      });
      lastDateKey = messageDateKey;
    }

    if (message.type === "system") {
      items.push({ kind: "system", message });
      continue;
    }

    if (message.type === "poll") {
      items.push({
        kind: "poll",
        message,
        isMine: Boolean(currentUserId && message.sender_user_id === currentUserId),
      });
      continue;
    }

    const isMine = Boolean(currentUserId && message.sender_user_id === currentUserId);
    const last = items[items.length - 1];

    if (
      last?.kind === "group" &&
      last.isMine === isMine &&
      last.senderId === message.sender_user_id &&
      new Date(message.created_at).getTime() -
        new Date(last.messages[last.messages.length - 1].created_at).getTime() <=
        GROUP_WINDOW_MS
    ) {
      last.messages.push(message);
      continue;
    }

    items.push({
      kind: "group",
      senderId: message.sender_user_id,
      messages: [message],
      isMine,
    });
  }

  return items;
}

export function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatBubbleMeta(message: ChatMessage, isMine: boolean): string {
  const time = formatMessageTime(message.created_at);
  if (isMine) return `You • ${time}`;
  return `${senderDisplayName(message)} • ${time}`;
}

export function senderDisplayName(message: ChatMessage): string {
  return message.sender?.display_name?.trim() || "Participant";
}

export function senderInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}
