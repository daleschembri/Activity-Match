import type { AppNotification } from "@activity-match/shared";

export function getNotificationHref(notification: AppNotification): string {
  switch (notification.type) {
    case "join_request_received":
      return "/host/requests";
    case "join_request_accepted":
      return notification.activity_id ? `/activities/${notification.activity_id}/chat` : "/plans";
    case "join_request_declined":
    case "join_request_waitlisted":
      return notification.activity_id ? `/activities/${notification.activity_id}` : "/plans";
    default:
      return "/notifications";
  }
}

export function getNotificationIcon(type: AppNotification["type"]): string {
  switch (type) {
    case "join_request_received":
      return "person_add";
    case "join_request_accepted":
      return "check_circle";
    case "join_request_declined":
      return "cancel";
    case "join_request_waitlisted":
      return "hourglass_top";
    default:
      return "notifications";
  }
}

export function formatNotificationWhen(createdAt: string): string {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
