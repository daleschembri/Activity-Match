import { Icon } from "./Icon";

interface SystemMessageProps {
  type: string;
  body: string;
}

const icons: Record<string, string> = {
  activity_published: "campaign",
  participant_joined: "person_add",
  participant_left: "person_remove",
  capacity_reached: "groups",
  spaces_available: "event_available",
  details_changed: "edit_calendar",
  deadline_reminder: "alarm",
  attendance_request: "how_to_reg",
  activity_cancelled: "event_busy",
  feedback_prompt: "rate_review",
};

export function SystemMessage({ type, body }: SystemMessageProps) {
  return (
    <div className="flex gap-3 items-start bg-surface-container rounded-xl p-3 my-2">
      <Icon name={icons[type] ?? "info"} className="text-primary mt-0.5" />
      <p className="text-body-md text-on-surface-variant flex-1">{body}</p>
    </div>
  );
}
