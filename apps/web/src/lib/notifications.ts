import type { AppNotification } from "@activity-match/shared";
import { api } from "@/lib/api";

export function getNotificationHref(notification: AppNotification): string {
  switch (notification.type) {
    case "join_request_received":
      return "/host/requests";
    case "join_request_accepted":
      return notification.activity_id ? `/activities/${notification.activity_id}/chat` : "/plans";
    case "join_request_declined":
    case "join_request_waitlisted":
      return notification.activity_id ? `/activities/${notification.activity_id}` : "/plans";
    case "attendance_record_updated":
      return notification.activity_id
        ? `/activities/${notification.activity_id}/attendance/outcome`
        : "/plans";
    case "attendance_dispute_submitted":
      return notification.activity_id
        ? `/activities/${notification.activity_id}/attendance`
        : "/host/requests";
    case "activity_updated":
      return notification.activity_id ? `/activities/${notification.activity_id}` : "/plans";
    case "participant_removed":
      return "/plans";
    case "participant_joined":
      return notification.activity_id ? `/activities/${notification.activity_id}` : "/plans";
    case "attendance_mark_reminder":
      return notification.activity_id
        ? `/activities/${notification.activity_id}/attendance`
        : "/plans";
    case "feedback_prompt":
      return notification.activity_id
        ? `/activities/${notification.activity_id}/feedback`
        : "/plans";
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
    case "attendance_record_updated":
      return "event_note";
    case "attendance_dispute_submitted":
      return "rate_review";
    case "activity_updated":
      return "edit_calendar";
    case "participant_removed":
      return "person_remove";
    case "participant_joined":
      return "person_add";
    case "attendance_mark_reminder":
      return "how_to_reg";
    case "feedback_prompt":
      return "thumb_up";
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

export async function resolveNotificationHref(notification: AppNotification): Promise<string> {
  if (notification.type === "attendance_mark_reminder" && notification.activity_id) {
    const resolved = await api.isAttendanceResolved(notification.activity_id);
    if (resolved) {
      return `/activities/${notification.activity_id}/past`;
    }
  }
  return getNotificationHref(notification);
}
