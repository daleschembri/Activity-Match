import type { ChatSummary } from "@activity-match/shared";

export function isArchivedChat(chat: ChatSummary): boolean {
  return chat.status === "completed";
}

export function isHappeningSoonChat(chat: ChatSummary): boolean {
  if (isArchivedChat(chat)) return false;
  if (!chat.starts_at) return true;
  const starts = new Date(chat.starts_at).getTime();
  const now = Date.now();
  // Upcoming or started within the last 48 hours
  return starts > now - 48 * 60 * 60 * 1000;
}

export function splitChatsBySection(chats: ChatSummary[]) {
  const happeningSoon = chats.filter(isHappeningSoonChat);
  const past = chats.filter((chat) => !isHappeningSoonChat(chat));
  return { happeningSoon, past };
}

export function formatChatListTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfDate.getTime()) / 86400000);

  if (dayDiff === 0) {
    return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatSessionChip(startsAt: string | null): string | null {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  const time = date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  if (isToday) return `Today ${time}`;
  if (isTomorrow) return `Tomorrow ${time}`;
  return date.toLocaleString(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function chatPreviewText(chat: ChatSummary): string {
  if (isArchivedChat(chat)) return "The activity has finished.";
  const last = chat.last_message;
  if (!last) return "No messages yet";
  if (last.type === "poll") return `${last.sender_name ?? "Someone"}: Poll`;
  if (last.type === "system") {
    if (last.body === "A participant joined") return "Someone has joined";
    return last.body;
  }
  const sender = last.sender_name ?? "Someone";
  return `${sender}: ${last.body}`;
}

export function chatIconForCategory(categoryName?: string): string {
  const name = (categoryName ?? "").toLowerCase();
  if (name.includes("yoga") || name.includes("wellness")) return "self_improvement";
  if (name.includes("run") || name.includes("sport") || name.includes("fitness")) return "directions_run";
  if (name.includes("food") || name.includes("coffee")) return "restaurant";
  if (name.includes("music") || name.includes("art")) return "music_note";
  return "chat";
}
