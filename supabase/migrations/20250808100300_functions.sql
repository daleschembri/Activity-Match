-- Helper functions and triggers
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER activities_updated_at BEFORE UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER activity_groups_updated_at BEFORE UPDATE ON activity_groups
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION participation_count(p_activity_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM participations
  WHERE activity_id = p_activity_id AND status = 'confirmed';
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  IF char_length(v_name) < 2 THEN
    v_name := 'User';
  END IF;

  v_name := left(v_name, 40);

  INSERT INTO profiles (id, display_name, home_location, home_area_label)
  VALUES (
    NEW.id,
    v_name,
    extensions.ST_SetSRID(extensions.ST_MakePoint(0, 0), 4326)::geography,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'home_area_label'), ''), 'Unknown')
  );
  INSERT INTO reliability_records (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION create_activity_conversation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    INSERT INTO conversations (activity_id) VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM conversations WHERE activity_id = NEW.id
    ) THEN
      INSERT INTO conversations (activity_id) VALUES (NEW.id);
    END IF;
    IF NEW.host_is_participating THEN
      INSERT INTO participations (activity_id, user_id, status)
      VALUES (NEW.id, NEW.host_user_id, 'confirmed')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER activity_published_conversation
  AFTER UPDATE ON activities
  FOR EACH ROW EXECUTE FUNCTION create_activity_conversation();

CREATE OR REPLACE FUNCTION post_system_message(
  p_conversation_id UUID,
  p_type TEXT,
  p_body TEXT,
  p_payload JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO messages (conversation_id, type, body, payload)
  VALUES (p_conversation_id, 'system', p_body, p_payload || jsonb_build_object('system_type', p_type))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic join acceptance
CREATE OR REPLACE FUNCTION accept_join_request(p_request_id UUID, p_actor_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_req join_requests%ROWTYPE;
  v_activity activities%ROWTYPE;
  v_count INTEGER;
  v_participation_id UUID;
  v_conversation_id UUID;
BEGIN
  SELECT * INTO v_req FROM join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND'));
  END IF;

  SELECT * INTO v_activity FROM activities WHERE id = v_req.activity_id FOR UPDATE;
  IF v_activity.host_user_id != p_actor_id AND v_activity.acceptance_mode = 'approval' THEN
    IF p_actor_id != v_req.user_id THEN
      RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_PERMITTED'));
    END IF;
  END IF;

  IF v_req.status NOT IN ('pending', 'waitlisted') THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'INVALID_STATE'));
  END IF;

  v_count := participation_count(v_activity.id);
  IF v_activity.capacity IS NOT NULL AND v_count >= v_activity.capacity THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'ACTIVITY_FULL'));
  END IF;

  UPDATE join_requests SET status = 'accepted', resolved_at = now() WHERE id = p_request_id;

  INSERT INTO participations (activity_id, user_id, status)
  VALUES (v_activity.id, v_req.user_id, 'confirmed')
  RETURNING id INTO v_participation_id;

  SELECT id INTO v_conversation_id FROM conversations WHERE activity_id = v_activity.id LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN
    PERFORM post_system_message(v_conversation_id, 'participant_joined', 'A participant joined', jsonb_build_object('user_id', v_req.user_id));
  END IF;

  RETURN jsonb_build_object('data', jsonb_build_object(
    'participation_id', v_participation_id,
    'request_id', p_request_id,
    'status', 'accepted'
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_join_request_atomic(
  p_user_id UUID,
  p_activity_id UUID,
  p_introduction TEXT,
  p_availability_confirmed BOOLEAN,
  p_source join_source
) RETURNS JSONB AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_count INTEGER;
  v_request_id UUID;
  v_status join_request_status;
  v_conversation_id UUID;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND OR v_activity.status != 'published' THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'ACTIVITY_NOT_JOINABLE'));
  END IF;

  IF v_activity.host_user_id = p_user_id THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_PERMITTED'));
  END IF;

  IF EXISTS (
    SELECT 1 FROM join_requests
    WHERE activity_id = p_activity_id AND user_id = p_user_id
      AND status IN ('pending', 'waitlisted', 'accepted')
  ) THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'ALREADY_REQUESTED'));
  END IF;

  v_count := participation_count(p_activity_id);
  IF v_activity.capacity IS NOT NULL AND v_count >= v_activity.capacity THEN
    v_status := 'waitlisted';
  ELSIF v_activity.acceptance_mode = 'auto' THEN
  INSERT INTO join_requests (activity_id, user_id, status, introduction, availability_confirmed, source)
  VALUES (p_activity_id, p_user_id, 'pending', p_introduction, p_availability_confirmed, p_source)
  RETURNING id INTO v_request_id;
    RETURN accept_join_request(v_request_id, p_user_id);
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO join_requests (activity_id, user_id, status, introduction, availability_confirmed, source, waitlist_position)
  VALUES (
    p_activity_id, p_user_id, v_status, p_introduction, p_availability_confirmed, p_source,
    CASE WHEN v_status = 'waitlisted' THEN (
      SELECT COALESCE(MAX(waitlist_position), 0) + 1 FROM join_requests WHERE activity_id = p_activity_id AND status = 'waitlisted'
    ) ELSE NULL END
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('data', jsonb_build_object('request_id', v_request_id, 'status', v_status));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION travel_minutes(
  viewer_point geography,
  target_point geography,
  speed_kmh NUMERIC DEFAULT 30
) RETURNS INTEGER AS $$
  SELECT GREATEST(1, ROUND(ST_Distance(viewer_point, target_point) / 1000.0 / speed_kmh * 60))::INTEGER;
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_activity_detail(p_activity_id UUID, p_viewer_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_role TEXT := 'viewer';
  v_participant_count INTEGER;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND'));
  END IF;

  v_participant_count := participation_count(p_activity_id);

  IF p_viewer_id IS NOT NULL THEN
    IF v_activity.host_user_id = p_viewer_id THEN
      v_role := 'host';
    ELSIF EXISTS (SELECT 1 FROM participations WHERE activity_id = p_activity_id AND user_id = p_viewer_id AND status = 'confirmed') THEN
      v_role := 'participant';
    ELSIF EXISTS (SELECT 1 FROM join_requests WHERE activity_id = p_activity_id AND user_id = p_viewer_id AND status IN ('pending', 'waitlisted')) THEN
      v_role := 'requester';
    END IF;
  ELSE
    v_role := 'anonymous';
  END IF;

  RETURN jsonb_build_object('data', jsonb_build_object(
    'id', v_activity.id,
    'title', v_activity.title,
    'description', v_activity.description,
    'listing_type', v_activity.listing_type,
    'status', v_activity.status,
    'starts_at', v_activity.starts_at,
    'duration_minutes', v_activity.duration_minutes,
    'capacity', v_activity.capacity,
    'participation_count', v_participant_count,
    'spaces_remaining', CASE WHEN v_activity.capacity IS NULL THEN NULL ELSE GREATEST(0, v_activity.capacity - v_participant_count) END,
    'is_full', v_activity.capacity IS NOT NULL AND v_participant_count >= v_activity.capacity,
    'is_joinable', v_activity.status = 'published' AND (v_activity.capacity IS NULL OR v_participant_count < v_activity.capacity),
    'acceptance_mode', v_activity.acceptance_mode,
    'visibility', v_activity.visibility,
    'public_slug', v_activity.public_slug,
    'viewer_role', v_role,
    'cost_amount', v_activity.cost_amount,
    'cost_currency', v_activity.cost_currency,
    'skill_level', v_activity.skill_level
  ));
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
