-- Use joiner display name in chat system messages.

CREATE OR REPLACE FUNCTION accept_join_request(p_request_id UUID, p_actor_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req join_requests%ROWTYPE;
  v_activity activities%ROWTYPE;
  v_count INTEGER;
  v_participation_id UUID;
  v_conversation_id UUID;
  v_joiner_name TEXT;
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
    SELECT display_name INTO v_joiner_name FROM profiles WHERE id = v_req.user_id;
    v_joiner_name := COALESCE(NULLIF(trim(v_joiner_name), ''), 'Someone');

    PERFORM post_system_message(
      v_conversation_id,
      'participant_joined',
      v_joiner_name || ' has joined',
      jsonb_build_object('user_id', v_req.user_id, 'display_name', v_joiner_name)
    );
  END IF;

  RETURN jsonb_build_object('data', jsonb_build_object(
    'participation_id', v_participation_id,
    'request_id', p_request_id,
    'status', 'accepted'
  ));
END;
$$;
