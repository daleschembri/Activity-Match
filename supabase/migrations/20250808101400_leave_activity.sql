-- Allow participants to leave an activity they joined
CREATE OR REPLACE FUNCTION public.leave_activity(p_activity_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_participation_id UUID;
  v_conversation_id UUID;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND'));
  END IF;

  IF v_activity.host_user_id = p_user_id THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'HOST_CANNOT_LEAVE'));
  END IF;

  UPDATE participations
  SET status = 'cancelled_by_user',
      cancelled_at = now()
  WHERE activity_id = p_activity_id
    AND user_id = p_user_id
    AND status = 'confirmed'
  RETURNING id INTO v_participation_id;

  IF v_participation_id IS NULL THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_PARTICIPANT'));
  END IF;

  UPDATE join_requests
  SET status = 'withdrawn',
      resolved_at = now()
  WHERE activity_id = p_activity_id
    AND user_id = p_user_id
    AND status = 'accepted';

  SELECT id INTO v_conversation_id FROM conversations WHERE activity_id = p_activity_id LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN
    PERFORM post_system_message(
      v_conversation_id,
      'participant_left',
      'A participant left',
      jsonb_build_object('user_id', p_user_id)
    );
  END IF;

  RETURN jsonb_build_object('data', jsonb_build_object('ok', true));
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_join_request(p_activity_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  UPDATE join_requests
  SET status = 'withdrawn',
      resolved_at = now()
  WHERE activity_id = p_activity_id
    AND user_id = p_user_id
    AND status IN ('pending', 'waitlisted')
  RETURNING id INTO v_request_id;

  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND'));
  END IF;

  RETURN jsonb_build_object('data', jsonb_build_object('ok', true));
END;
$$;
