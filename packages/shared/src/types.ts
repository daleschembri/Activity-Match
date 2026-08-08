import type {
  AcceptanceMode,
  ActivityStatus,
  JoinRequestStatus,
  ListingType,
  NotificationType,
  ParticipationStatus,
  ProfileGender,
  SkillLevel,
  Visibility,
} from "./enums";

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_ref: string | null;
  bio: string | null;
  home_area_label: string;
  travel_radius_minutes: number;
  date_of_birth: string | null;
  gender: ProfileGender | null;
  verification_status: "unverified" | "pending" | "verified";
  account_status: "active" | "suspended" | "deactivated" | "deleted";
  locale: string;
  timezone: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
}

export interface LocationSummary {
  id: string;
  name: string;
  area_label: string;
  is_public_place: boolean;
}

export interface LocationDetail extends LocationSummary {
  address_line?: string;
  point?: { lat: number; lng: number };
  timezone: string;
}

export interface ActivitySummary {
  id: string;
  title: string;
  listing_type: ListingType;
  status: ActivityStatus;
  category: Category;
  starts_at: string | null;
  duration_minutes: number | null;
  area_label: string | null;
  distance_from_viewer_minutes: number | null;
  cost_amount: number;
  cost_currency: string;
  skill_level: SkillLevel;
  capacity: number | null;
  participation_count: number;
  spaces_remaining: number | null;
  is_full: boolean;
  is_joinable: boolean;
  host: Pick<UserProfile, "id" | "display_name" | "avatar_ref">;
  tags: string[];
  cover_image_ref?: string | null;
  published_at?: string;
}

export interface ActivityDetail extends ActivitySummary {
  description: string;
  location?: LocationDetail;
  quorum: number | null;
  cost_note: string | null;
  equipment_note: string | null;
  equipment_provided: boolean;
  accessibility_note: string | null;
  min_age: number | null;
  max_age: number | null;
  join_deadline: string | null;
  acceptance_mode: AcceptanceMode;
  visibility: Visibility;
  public_slug: string;
  host: Pick<UserProfile, "id" | "display_name" | "avatar_ref" | "bio">;
  participants?: Array<Pick<UserProfile, "id" | "display_name" | "avatar_ref"> & { is_host?: boolean }>;
  participant_count_visible: number;
  viewer_role: "anonymous" | "viewer" | "requester" | "participant" | "host";
  viewer_join_request_id?: string;
  screening_questions?: Array<{ id: string; question: string }>;
}

export interface JoinRequest {
  id: string;
  activity_id: string;
  user_id: string;
  status: JoinRequestStatus;
  introduction: string | null;
  waitlist_position: number | null;
  claim_expires_at: string | null;
  created_at: string;
  user: Pick<UserProfile, "id" | "display_name" | "avatar_ref">;
  activity?: Pick<ActivitySummary, "id" | "title">;
}

export interface Participation {
  id: string;
  activity_id: string;
  user_id: string;
  status: ParticipationStatus;
  created_at: string;
}

export interface FeedPage {
  items: ActivitySummary[];
  next_cursor: string | null;
  total_available: number;
  exhausted: boolean;
  filters_widened: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_user_id: string | null;
  type: "user_text" | "user_media" | "system" | "poll";
  body: string;
  payload: Record<string, unknown>;
  created_at: string;
  edited_at: string | null;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  category: Category;
  frequency: "weekly" | "fortnightly" | "monthly" | "irregular";
  preferred_days: string[];
  target_size: number | null;
  skill_level: SkillLevel;
  attendance_mode: "fixed" | "flexible";
  membership_state: "open" | "approval" | "closed";
  chat_persists_between_sessions: boolean;
  status: "active" | "dormant" | "archived";
  member_count: number;
  upcoming_sessions: ActivitySummary[];
}

export interface ReliabilityDisplay {
  label: string;
  attended_count?: number;
  late_cancellation_count?: number;
  no_show_count?: number;
  hosted_count?: number;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  activity_id: string | null;
  join_request_id: string | null;
  actor_user_id: string | null;
  read_at: string | null;
  created_at: string;
  payload: Record<string, unknown>;
  activity?: Pick<ActivitySummary, "id" | "title"> | null;
  actor?: Pick<UserProfile, "id" | "display_name" | "avatar_ref"> | null;
}

export interface DraftField<T> {
  value: T;
  confidence: number;
  origin: "extracted" | "inferred" | "default" | "missing";
}

export interface ActivityDraft {
  title?: DraftField<string>;
  description?: DraftField<string>;
  category_id?: DraftField<string>;
  starts_at?: DraftField<string>;
  duration_minutes?: DraftField<number>;
  capacity?: DraftField<number>;
  cost_amount?: DraftField<number>;
  skill_level?: DraftField<SkillLevel>;
  suggested_tags: string[];
}
