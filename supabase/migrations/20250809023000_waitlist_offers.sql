-- Waitlist offer flow: notify waitlisted users (auto) or host (approval) when a seat opens.

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'waitlist_offered';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'waitlist_spot_opened';

CREATE OR REPLACE FUNCTION public.compute_waitlist_claim_expires_at(p_activity_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_max_minutes INTEGER := 120;
  v_min_minutes INTEGER := 15;
  v_window_minutes INTEGER;
  v_minutes_until_start NUMERIC;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RETURN now() + interval '2 hours';
  END IF;

  SELECT value::INTEGER INTO v_max_minutes FROM app_config WHERE key = 'waitlist_claim_window_max_minutes';
  SELECT value::INTEGER INTO v_min_minutes FROM app_config WHERE key = 'waitlist_claim_window_min_minutes';

  v_max_minutes := COALESCE(v_max_minutes, 120);
  v_min_minutes := COALESCE(v_min_minutes, 15);

  IF v_activity.starts_at IS NULL THEN
    v_window_minutes := v_max_minutes;
  ELSE
    v_minutes_until_start := EXTRACT(EPOCH FROM (v_activity.starts_at - now())) / 60.0;
    IF v_minutes_until_start <= 0 THEN
      v_window_minutes := v_min_minutes;
    ELSE
      v_window_minutes := LEAST(v_max_minutes, GREATEST(v_min_minutes, floor(v_minutes_until_start * 0.25)::INTEGER));
    END IF;
  END IF;

  RETURN now() + (v_window_minutes || ' minutes')::interval;
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_waitlist_positions(p_activity_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_pos INTEGER := 0;
BEGIN
  FOR v_row IN
    SELECT id
    FROM join_requests
    WHERE activity_id = p_activity_id
      AND status = 'waitlisted'
    ORDER BY COALESCE(waitlist_position, 999999), created_at ASC
  LOOP
    v_pos := v_pos + 1;
    UPDATE join_requests SET waitlist_position = v_pos WHERE id = v_row.id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_waitlist_offers(p_activity_id UUID, p_except_request_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE join_requests
  SET claim_expires_at = NULL
  WHERE activity_id = p_activity_id
    AND status = 'waitlisted'
    AND claim_expires_at IS NOT NULL
    AND (p_except_request_id IS NULL OR id != p_except_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.process_waitlist_on_seat_opened(p_activity_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_count INTEGER;
  v_waitlist_count INTEGER;
  v_expires TIMESTAMPTZ;
  v_req RECORD;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND OR v_activity.status != 'published' THEN
    RETURN;
  END IF;

  v_count := participation_count(p_activity_id);
  IF v_activity.capacity IS NULL OR v_count >= v_activity.capacity THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_waitlist_count
  FROM join_requests
  WHERE activity_id = p_activity_id
    AND status = 'waitlisted';

  IF v_waitlist_count = 0 THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM join_requests
    WHERE activity_id = p_activity_id
      AND status = 'waitlisted'
      AND claim_expires_at IS NOT NULL
      AND claim_expires_at > now()
  ) THEN
    RETURN;
  END IF;

  IF v_activity.acceptance_mode = 'auto' THEN
    v_expires := compute_waitlist_claim_expires_at(p_activity_id);

    UPDATE join_requests
    SET claim_expires_at = v_expires
    WHERE activity_id = p_activity_id
      AND status = 'waitlisted';

    FOR v_req IN
      SELECT id, user_id
      FROM join_requests
      WHERE activity_id = p_activity_id
        AND status = 'waitlisted'
    LOOP
      PERFORM create_notification(
        v_req.user_id,
        'waitlist_offered',
        'Spot available!',
        'A spot opened for ' || v_activity.title || '. Claim it before time runs out.',
        p_activity_id,
        v_req.id,
        NULL,
        jsonb_build_object('claim_expires_at', v_expires)
      );
    END LOOP;
  ELSE
    PERFORM create_notification(
      v_activity.host_user_id,
      'waitlist_spot_opened',
      'Spot opened',
      'A spot opened for ' || v_activity.title || '. Pick someone from the waitlist.',
      p_activity_id,
      NULL,
      NULL,
      '{}'::jsonb
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_waitlist_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  FOR v_activity_id IN
    SELECT DISTINCT activity_id
    FROM join_requests
    WHERE status = 'waitlisted'
      AND claim_expires_at IS NOT NULL
      AND claim_expires_at <= now()
  LOOP
    PERFORM clear_waitlist_offers(v_activity_id);
    PERFORM process_waitlist_on_seat_opened(v_activity_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.decline_waitlist_offer(p_request_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req join_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.user_id != p_user_id THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND'));
  END IF;

  IF v_req.status != 'waitlisted' OR v_req.claim_expires_at IS NULL THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'INVALID_STATE'));
  END IF;

  UPDATE join_requests
  SET claim_expires_at = NULL
  WHERE id = p_request_id;

  RETURN jsonb_build_object('data', jsonb_build_object('ok', true));
END;
$$;

CREATE OR REPLACE FUNCTION public.host_move_request_to_waitlist(p_request_id UUID, p_host_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req join_requests%ROWTYPE;
  v_activity activities%ROWTYPE;
  v_count INTEGER;
  v_position INTEGER;
BEGIN
  SELECT * INTO v_req FROM join_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND OR v_req.status != 'pending' THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'INVALID_STATE'));
  END IF;

  SELECT * INTO v_activity FROM activities WHERE id = v_req.activity_id FOR UPDATE;
  IF NOT FOUND OR v_activity.host_user_id != p_host_id THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_PERMITTED'));
  END IF;

  v_count := participation_count(v_activity.id);
  IF v_activity.capacity IS NULL OR v_count < v_activity.capacity THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'ACTIVITY_NOT_FULL'));
  END IF;

  SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_position
  FROM join_requests
  WHERE activity_id = v_req.activity_id
    AND status = 'waitlisted';

  UPDATE join_requests
  SET status = 'waitlisted',
      waitlist_position = v_position,
      resolved_at = NULL
  WHERE id = p_request_id;

  RETURN jsonb_build_object('data', jsonb_build_object('ok', true));
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_join_request(p_request_id UUID, p_actor_id UUID)
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

  IF v_req.status = 'waitlisted' AND v_req.user_id = p_actor_id THEN
    IF v_req.claim_expires_at IS NULL OR v_req.claim_expires_at <= now() THEN
      RETURN jsonb_build_object('error', jsonb_build_object('code', 'OFFER_EXPIRED'));
    END IF;
  ELSIF v_activity.host_user_id != p_actor_id THEN
    IF v_activity.acceptance_mode = 'approval' AND p_actor_id != v_req.user_id THEN
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

  UPDATE join_requests SET status = 'accepted', resolved_at = now(), claim_expires_at = NULL WHERE id = p_request_id;

  INSERT INTO participations (activity_id, user_id, status)
  VALUES (v_activity.id, v_req.user_id, 'confirmed')
  RETURNING id INTO v_participation_id;

  PERFORM clear_waitlist_offers(v_activity.id);

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

  PERFORM process_waitlist_on_seat_opened(p_activity_id);

  RETURN jsonb_build_object('data', jsonb_build_object('ok', true));
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_participant_by_host(
  p_activity_id UUID,
  p_participant_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
  v_activity activities%ROWTYPE;
  v_participation_id UUID;
  v_conversation_id UUID;
BEGIN
  v_host_id := auth.uid();
  IF v_host_id IS NULL THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'UNAUTHORIZED'));
  END IF;

  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND'));
  END IF;

  IF v_activity.host_user_id != v_host_id THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'FORBIDDEN'));
  END IF;

  IF p_participant_user_id = v_host_id THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'CANNOT_REMOVE_HOST'));
  END IF;

  IF v_activity.status NOT IN ('published', 'draft') THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'ACTIVITY_NOT_EDITABLE'));
  END IF;

  UPDATE participations
  SET status = 'removed_by_host',
      cancelled_at = now()
  WHERE activity_id = p_activity_id
    AND user_id = p_participant_user_id
    AND status = 'confirmed'
  RETURNING id INTO v_participation_id;

  IF v_participation_id IS NULL THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_PARTICIPANT'));
  END IF;

  UPDATE join_requests
  SET status = 'declined',
      resolved_at = now()
  WHERE activity_id = p_activity_id
    AND user_id = p_participant_user_id
    AND status = 'accepted';

  SELECT id INTO v_conversation_id FROM conversations WHERE activity_id = p_activity_id LIMIT 1;
  IF v_conversation_id IS NOT NULL THEN
    PERFORM post_system_message(
      v_conversation_id,
      'participant_removed',
      'A participant was removed',
      jsonb_build_object('user_id', p_participant_user_id)
    );
  END IF;

  PERFORM create_notification(
    p_participant_user_id,
    'participant_removed',
    'Removed from activity',
    'You are no longer listed for ' || v_activity.title || '.',
    p_activity_id,
    NULL,
    v_host_id,
    '{}'::jsonb
  );

  PERFORM process_waitlist_on_seat_opened(p_activity_id);

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
      resolved_at = now(),
      claim_expires_at = NULL
  WHERE activity_id = p_activity_id
    AND user_id = p_user_id
    AND status IN ('pending', 'waitlisted')
  RETURNING id INTO v_request_id;

  IF v_request_id IS NULL THEN
    RETURN jsonb_build_object('error', jsonb_build_object('code', 'NOT_FOUND'));
  END IF;

  PERFORM recompute_waitlist_positions(p_activity_id);

  RETURN jsonb_build_object('data', jsonb_build_object('ok', true));
END;
$$;
