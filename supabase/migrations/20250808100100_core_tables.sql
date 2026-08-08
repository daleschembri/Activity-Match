-- Core tables
CREATE TABLE app_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  parent_id UUID REFERENCES categories(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE category_adjacency (
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  adjacent_category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (category_id, adjacent_category_id)
);

CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  is_system BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 40),
  avatar_ref TEXT,
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 300),
  home_location geography(POINT, 4326) NOT NULL,
  home_area_label TEXT NOT NULL,
  travel_radius_minutes INTEGER NOT NULL DEFAULT 20 CHECK (travel_radius_minutes BETWEEN 5 AND 120),
  date_of_birth DATE,
  verification_status verification_status NOT NULL DEFAULT 'unverified',
  account_status account_status NOT NULL DEFAULT 'active',
  locale TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address_line TEXT,
  area_label TEXT NOT NULL,
  point geography(POINT, 4326) NOT NULL,
  is_public_place BOOLEAN NOT NULL DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

CREATE TABLE activity_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 60),
  description TEXT,
  category_id UUID NOT NULL REFERENCES categories(id),
  frequency group_frequency NOT NULL DEFAULT 'weekly',
  preferred_days day_of_week[] NOT NULL DEFAULT '{}',
  preferred_time_start TIME,
  preferred_time_end TIME,
  default_location_id UUID REFERENCES locations(id),
  target_size INTEGER,
  skill_level skill_level NOT NULL DEFAULT 'any',
  attendance_mode attendance_mode NOT NULL DEFAULT 'flexible',
  membership_state membership_state NOT NULL DEFAULT 'open',
  chat_persists_between_sessions BOOLEAN NOT NULL DEFAULT true,
  status group_status NOT NULL DEFAULT 'active',
  last_session_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_slug TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  host_user_id UUID NOT NULL REFERENCES profiles(id),
  group_id UUID REFERENCES activity_groups(id),
  listing_type listing_type NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 80),
  description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  category_id UUID NOT NULL REFERENCES categories(id),
  starts_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  location_id UUID REFERENCES locations(id),
  capacity INTEGER CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 200),
  quorum INTEGER CHECK (quorum IS NULL OR quorum BETWEEN 2 AND 100),
  cost_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  cost_currency TEXT NOT NULL DEFAULT 'EUR',
  cost_note TEXT,
  skill_level skill_level NOT NULL DEFAULT 'any',
  equipment_note TEXT,
  equipment_provided BOOLEAN NOT NULL DEFAULT false,
  accessibility_note TEXT,
  min_age INTEGER CHECK (min_age IS NULL OR min_age BETWEEN 16 AND 120),
  max_age INTEGER CHECK (max_age IS NULL OR max_age BETWEEN 16 AND 120),
  join_deadline TIMESTAMPTZ,
  acceptance_mode acceptance_mode NOT NULL DEFAULT 'auto',
  visibility visibility_type NOT NULL DEFAULT 'public',
  status activity_status NOT NULL DEFAULT 'draft',
  cancelled_reason TEXT,
  host_is_participating BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT activities_age_range CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age),
  CONSTRAINT activities_invite_visibility CHECK (
    acceptance_mode != 'invite_only' OR visibility = 'link_only'
  )
);

CREATE TABLE activity_tags (
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id),
  origin tag_origin NOT NULL DEFAULT 'host_added',
  PRIMARY KEY (activity_id, tag_id)
);

CREATE TABLE availability_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  day_of_week day_of_week,
  date DATE,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL
);

CREATE TABLE user_interests (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id),
  weight NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  PRIMARY KEY (user_id, category_id)
);

CREATE TABLE user_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  time_start TIME NOT NULL,
  time_end TIME NOT NULL
);

CREATE TABLE reliability_records (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  attended_count INTEGER NOT NULL DEFAULT 0,
  late_cancellation_count INTEGER NOT NULL DEFAULT 0,
  no_show_count INTEGER NOT NULL DEFAULT 0,
  hosted_count INTEGER NOT NULL DEFAULT 0,
  hosted_cancelled_count INTEGER NOT NULL DEFAULT 0,
  last_recalculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activities_status ON activities(status);
CREATE INDEX idx_activities_published ON activities(published_at) WHERE status = 'published';
CREATE INDEX idx_activities_host ON activities(host_user_id);
CREATE INDEX idx_profiles_location ON profiles USING GIST(home_location);
CREATE INDEX idx_locations_point ON locations USING GIST(point);
