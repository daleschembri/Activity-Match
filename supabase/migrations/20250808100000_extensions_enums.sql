-- Extensions and enums
-- On Supabase hosted, extensions live in the "extensions" schema.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

CREATE TYPE listing_type AS ENUM ('confirmed', 'proposed', 'idea');
CREATE TYPE activity_status AS ENUM ('draft', 'published', 'cancelled', 'completed', 'expired');
CREATE TYPE acceptance_mode AS ENUM ('auto', 'approval', 'invite_only', 'approval_with_questions');
CREATE TYPE visibility_type AS ENUM ('public', 'link_only');
CREATE TYPE skill_level AS ENUM ('any', 'beginner', 'intermediate', 'advanced');
CREATE TYPE join_request_status AS ENUM ('pending', 'accepted', 'declined', 'waitlisted', 'withdrawn', 'expired');
CREATE TYPE join_intent AS ENUM ('join', 'interest');
CREATE TYPE join_source AS ENUM ('swipe', 'detail', 'share_link', 'invite');
CREATE TYPE participation_status AS ENUM ('confirmed', 'cancelled_by_user', 'removed_by_host', 'attended', 'no_show');
CREATE TYPE swipe_direction AS ENUM ('left', 'right', 'up');
CREATE TYPE message_type AS ENUM ('user_text', 'user_media', 'system', 'poll');
CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'locked');
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deactivated', 'deleted');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE group_frequency AS ENUM ('weekly', 'fortnightly', 'monthly', 'irregular');
CREATE TYPE attendance_mode AS ENUM ('fixed', 'flexible');
CREATE TYPE membership_state AS ENUM ('open', 'approval', 'closed');
CREATE TYPE group_status AS ENUM ('active', 'dormant', 'archived');
CREATE TYPE group_role AS ENUM ('owner', 'host', 'member');
CREATE TYPE group_membership_status AS ENUM ('active', 'pending', 'left', 'removed');
CREATE TYPE day_of_week AS ENUM ('mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun');
CREATE TYPE report_reason AS ENUM ('inappropriate_content', 'dating_solicitation', 'harassment', 'spam', 'unsafe', 'other');
CREATE TYPE report_status AS ENUM ('open', 'reviewing', 'actioned', 'dismissed');
CREATE TYPE report_target AS ENUM ('user', 'activity', 'message', 'group');
CREATE TYPE tag_origin AS ENUM ('suggested', 'host_added');
