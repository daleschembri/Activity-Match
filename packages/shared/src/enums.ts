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
export type SkillLevel = (typeof SkillLevel)[keyof typeof SkillLevel];
export type ProfileGender = (typeof ProfileGender)[keyof typeof ProfileGender];
