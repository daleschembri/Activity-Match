-- Join, participation, discovery
CREATE TABLE join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  guest_id UUID,
  intent join_intent NOT NULL DEFAULT 'join',
  status join_request_status NOT NULL DEFAULT 'pending',
  introduction TEXT CHECK (introduction IS NULL OR char_length(introduction) <= 300),
  availability_confirmed BOOLEAN NOT NULL DEFAULT false,
  waitlist_position INTEGER,
  claim_expires_at TIMESTAMPTZ,
  source join_source NOT NULL DEFAULT 'detail',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT join_requests_actor CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL)
);

CREATE UNIQUE INDEX idx_join_requests_active_user
  ON join_requests(activity_id, user_id)
  WHERE user_id IS NOT NULL AND status IN ('pending', 'waitlisted', 'accepted');

CREATE TABLE participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  guest_id UUID,
  status participation_status NOT NULL DEFAULT 'confirmed',
  attendance_confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  is_late_cancellation BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT participations_actor CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL)
);

CREATE UNIQUE INDEX idx_participations_active_user
  ON participations(activity_id, user_id)
  WHERE user_id IS NOT NULL AND status = 'confirmed';

CREATE TABLE swipe_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  direction swipe_direction NOT NULL,
  position_in_feed INTEGER NOT NULL,
  dwell_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_swipe_latest ON swipe_events(user_id, activity_id);

CREATE TABLE saved_activities (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_id)
);

CREATE TABLE screening_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  question TEXT NOT NULL CHECK (char_length(question) BETWEEN 5 AND 120),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE screening_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  join_request_id UUID NOT NULL REFERENCES join_requests(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES screening_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL CHECK (char_length(answer) <= 300)
);

CREATE TABLE blocks (
  blocker_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (blocker_user_id, blocked_user_id),
  CHECK (blocker_user_id != blocked_user_id)
);

CREATE TABLE idempotency_keys (
  key TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (key, user_id)
);

CREATE INDEX idx_idempotency_created ON idempotency_keys(created_at);

CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  contact_ref_hash TEXT NOT NULL,
  verified_at TIMESTAMPTZ,
  converted_user_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES activity_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role group_role NOT NULL DEFAULT 'member',
  status group_membership_status NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  group_id UUID REFERENCES activity_groups(id) ON DELETE CASCADE,
  status conversation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversation_target CHECK (
    (activity_id IS NOT NULL AND group_id IS NULL) OR
    (activity_id IS NULL AND group_id IS NOT NULL)
  )
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES profiles(id),
  type message_type NOT NULL DEFAULT 'user_text',
  body TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL REFERENCES profiles(id),
  target_type report_target NOT NULL,
  target_id UUID NOT NULL,
  reason report_reason NOT NULL,
  detail TEXT,
  status report_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  event_name TEXT NOT NULL,
  properties JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activity_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_join_requests_activity ON join_requests(activity_id, status);
CREATE INDEX idx_participations_activity ON participations(activity_id, status);
