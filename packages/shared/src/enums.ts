export const ListingType = {
  CONFIRMED: "confirmed",
  PROPOSED: "proposed",
  IDEA: "idea",
} as const;

export const ActivityStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  EXPIRED: "expired",
} as const;

export const AcceptanceMode = {
  AUTO: "auto",
  APPROVAL: "approval",
  INVITE_ONLY: "invite_only",
  APPROVAL_WITH_QUESTIONS: "approval_with_questions",
} as const;

export const Visibility = {
  PUBLIC: "public",
  LINK_ONLY: "link_only",
} as const;

export const JoinRequestStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  WAITLISTED: "waitlisted",
  WITHDRAWN: "withdrawn",
  EXPIRED: "expired",
} as const;

export const ParticipationStatus = {
  CONFIRMED: "confirmed",
  CANCELLED_BY_USER: "cancelled_by_user",
  REMOVED_BY_HOST: "removed_by_host",
  ATTENDED: "attended",
  NO_SHOW: "no_show",
} as const;

export const SwipeDirection = {
  LEFT: "left",
  RIGHT: "right",
  UP: "up",
} as const;

export const MessageType = {
  USER_TEXT: "user_text",
  USER_MEDIA: "user_media",
  SYSTEM: "system",
  POLL: "poll",
} as const;

export const NotificationType = {
  JOIN_REQUEST_RECEIVED: "join_request_received",
  JOIN_REQUEST_ACCEPTED: "join_request_accepted",
  JOIN_REQUEST_DECLINED: "join_request_declined",
  JOIN_REQUEST_WAITLISTED: "join_request_waitlisted",
  WAITLIST_OFFERED: "waitlist_offered",
  WAITLIST_SPOT_OPENED: "waitlist_spot_opened",
  ATTENDANCE_RECORD_UPDATED: "attendance_record_updated",
  ATTENDANCE_DISPUTE_SUBMITTED: "attendance_dispute_submitted",
  ACTIVITY_UPDATED: "activity_updated",
  PARTICIPANT_REMOVED: "participant_removed",
  PARTICIPANT_JOINED: "participant_joined",
  ATTENDANCE_MARK_REMINDER: "attendance_mark_reminder",
  FEEDBACK_PROMPT: "feedback_prompt",
} as const;

export const FeedbackSentiment = {
  UP: "up",
  DOWN: "down",
} as const;

export const FeedbackOutcome = {
  YES: "yes",
  PARTIAL: "partial",
  NO: "no",
} as const;

export const SkillLevel = {
  ANY: "any",
  BEGINNER: "beginner",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
} as const;

export const ProfileGender = {
  WOMAN: "woman",
  MAN: "man",
  NON_BINARY: "non_binary",
  PREFER_NOT_TO_SAY: "prefer_not_to_say",
} as const;

export type ListingType = (typeof ListingType)[keyof typeof ListingType];
export type ActivityStatus = (typeof ActivityStatus)[keyof typeof ActivityStatus];
export type AcceptanceMode = (typeof AcceptanceMode)[keyof typeof AcceptanceMode];
export type Visibility = (typeof Visibility)[keyof typeof Visibility];
export type JoinRequestStatus =
  (typeof JoinRequestStatus)[keyof typeof JoinRequestStatus];
export type ParticipationStatus =
  (typeof ParticipationStatus)[keyof typeof ParticipationStatus];
export type SwipeDirection = (typeof SwipeDirection)[keyof typeof SwipeDirection];
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export type FeedbackOutcome = (typeof FeedbackOutcome)[keyof typeof FeedbackOutcome];
export type FeedbackSentiment = (typeof FeedbackSentiment)[keyof typeof FeedbackSentiment];
export type SkillLevel = (typeof SkillLevel)[keyof typeof SkillLevel];
export type ProfileGender = (typeof ProfileGender)[keyof typeof ProfileGender];
