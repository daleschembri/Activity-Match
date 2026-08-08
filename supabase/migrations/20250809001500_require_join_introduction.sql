-- Require a message when requesting to join an activity

CREATE OR REPLACE FUNCTION public.create_join_request_atomic(
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
  v_introduction TEXT;
BEGIN
  v_introduction := NULLIF(btrim(p_introduction), '');

  IF v_introduction IS NULL THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object('code', 'INTRODUCTION_REQUIRED', 'message', 'A message to the host is required')
    );
  END IF;

  IF char_length(v_introduction) > 300 THEN
    RETURN jsonb_build_object(
      'error',
      jsonb_build_object('code', 'INTRODUCTION_TOO_LONG', 'message', 'Message must be 300 characters or fewer')
    );
  END IF;

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
    VALUES (p_activity_id, p_user_id, 'pending', v_introduction, p_availability_confirmed, p_source)
    RETURNING id INTO v_request_id;
    RETURN accept_join_request(v_request_id, p_user_id);
  ELSE
    v_status := 'pending';
  END IF;

  INSERT INTO join_requests (activity_id, user_id, status, introduction, availability_confirmed, source, waitlist_position)
  VALUES (
    p_activity_id, p_user_id, v_status, v_introduction, p_availability_confirmed, p_source,
    CASE WHEN v_status = 'waitlisted' THEN (
      SELECT COALESCE(MAX(waitlist_position), 0) + 1 FROM join_requests WHERE activity_id = p_activity_id AND status = 'waitlisted'
    ) ELSE NULL END
  )
  RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('data', jsonb_build_object('request_id', v_request_id, 'status', v_status));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
