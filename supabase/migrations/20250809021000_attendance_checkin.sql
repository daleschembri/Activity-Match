-- Pre-event attendance check-in: prompt 24h before starts_at, confirm in chat.

INSERT INTO app_config (key, value) VALUES ('attendance_confirmation_hours', '24')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS attendance_prompt_sent_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.ensure_attendance_checkin_prompt(p_activity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_hours INTEGER;
  v_conv_id UUID;
  v_confirm_by TIMESTAMPTZ;
  v_participant_count INTEGER;
  v_spaces_left INTEGER;
  v_location_name TEXT;
  v_cost_label TEXT;
  v_when_label TEXT;
  v_reminder_body TEXT;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_activity.status <> 'published' OR v_activity.starts_at IS NULL THEN
    RETURN;
  END IF;

  IF v_activity.starts_at <= now() THEN
    RETURN;
  END IF;

  SELECT COALESCE((value #>> '{}')::integer, 24) INTO v_hours
  FROM app_config WHERE key = 'attendance_confirmation_hours';

  IF v_activity.starts_at > now() + (v_hours || ' hours')::interval THEN
    RETURN;
  END IF;

  IF v_activity.attendance_prompt_sent_at IS NOT NULL THEN
    RETURN;
  END IF;

  SELECT id INTO v_conv_id FROM conversations WHERE activity_id = p_activity_id LIMIT 1;
  IF v_conv_id IS NULL THEN
    RETURN;
  END IF;

  v_participant_count := participation_count(p_activity_id);
  IF v_participant_count = 0 THEN
    RETURN;
  END IF;

  SELECT name INTO v_location_name FROM locations WHERE id = v_activity.location_id;
  v_location_name := COALESCE(v_location_name, 'TBD');

  IF v_activity.cost_amount > 0 THEN
    v_cost_label := COALESCE(v_activity.cost_currency, 'EUR') || ' ' || trim(to_char(v_activity.cost_amount, 'FM999990.##'));
  ELSE
    v_cost_label := 'Free';
  END IF;

  v_when_label := to_char(v_activity.starts_at AT TIME ZONE 'UTC', 'Dy DD Mon, HH24:MI');
  v_confirm_by := v_activity.starts_at - interval '2 hours';

  IF v_activity.capacity IS NOT NULL THEN
    v_spaces_left := GREATEST(v_activity.capacity - v_participant_count, 0);
  ELSE
    v_spaces_left := NULL;
  END IF;

  v_reminder_body := v_activity.title || E'\n' ||
    'When: ' || v_when_label || E'\n' ||
    'Location: ' || v_location_name || E'\n' ||
    'Fee: ' || v_cost_label;

  IF v_spaces_left IS NOT NULL THEN
    v_reminder_body := v_reminder_body || E'\n' ||
      CASE
        WHEN v_spaces_left = 0 THEN 'No spaces remain.'
        WHEN v_spaces_left = 1 THEN 'One space remains.'
        ELSE v_spaces_left::text || ' spaces remain.'
      END;
  END IF;

  v_reminder_body := v_reminder_body || E'\n' ||
    'Please confirm attendance by ' ||
    to_char(v_confirm_by AT TIME ZONE 'UTC', 'HH24:MI') || '.';

  PERFORM post_system_message(
    v_conv_id,
    'deadline_reminder',
    v_reminder_body,
    jsonb_build_object(
      'activity_id', p_activity_id,
      'confirm_by', v_confirm_by,
      'starts_at', v_activity.starts_at
    )
  );

  PERFORM post_system_message(
    v_conv_id,
    'attendance_request',
    'Are you still coming?',
    jsonb_build_object(
      'activity_id', p_activity_id,
      'confirm_by', v_confirm_by,
      'starts_at', v_activity.starts_at
    )
  );

  UPDATE activities
  SET attendance_prompt_sent_at = now(),
      updated_at = now()
  WHERE id = p_activity_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_activity_checkin(
  p_activity_id UUID,
  p_attending BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_activity activities%ROWTYPE;
  v_participation participations%ROWTYPE;
  v_late_threshold INTEGER;
  v_is_late BOOLEAN;
  v_conv_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;

  IF v_activity.host_user_id = v_user_id THEN
    RETURN;
  END IF;

  IF v_activity.status <> 'published' OR v_activity.starts_at IS NULL OR v_activity.starts_at <= now() THEN
    RAISE EXCEPTION 'Check-in is no longer available';
  END IF;

  SELECT * INTO v_participation
  FROM participations
  WHERE activity_id = p_activity_id
    AND user_id = v_user_id
    AND status = 'confirmed'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not a confirmed participant';
  END IF;

  IF p_attending THEN
    UPDATE participations
    SET attendance_confirmed_at = now()
    WHERE id = v_participation.id
      AND attendance_confirmed_at IS NULL;
    RETURN;
  END IF;

  SELECT COALESCE((value #>> '{}')::integer, 12) INTO v_late_threshold
  FROM app_config WHERE key = 'late_cancellation_threshold_hours';

  v_is_late := v_activity.starts_at <= now() + (v_late_threshold || ' hours')::interval;

  UPDATE participations
  SET status = 'cancelled_by_user',
      cancelled_at = now(),
      is_late_cancellation = v_is_late
  WHERE id = v_participation.id;

  UPDATE join_requests
  SET status = 'withdrawn',
      resolved_at = now()
  WHERE activity_id = p_activity_id
    AND user_id = v_user_id
    AND status = 'accepted';

  SELECT id INTO v_conv_id FROM conversations WHERE activity_id = p_activity_id LIMIT 1;
  IF v_conv_id IS NOT NULL THEN
    PERFORM post_system_message(
      v_conv_id,
      'participant_left',
      'A participant can''t make it',
      jsonb_build_object('user_id', v_user_id, 'reason', 'check_in_declined')
    );
  END IF;
END;
$$;

-- Batch job for cron: post prompts for activities entering the check-in window.
CREATE OR REPLACE FUNCTION public.send_attendance_checkin_prompts()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  FOR v_activity_id IN
    SELECT a.id
    FROM activities a
    WHERE a.status = 'published'
      AND a.starts_at IS NOT NULL
      AND a.starts_at > now()
      AND a.attendance_prompt_sent_at IS NULL
      AND a.starts_at <= now() + (
        SELECT COALESCE((value #>> '{}')::integer, 24)
        FROM app_config WHERE key = 'attendance_confirmation_hours'
      ) * interval '1 hour'
  LOOP
    PERFORM ensure_attendance_checkin_prompt(v_activity_id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_attendance_checkin_prompt(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_activity_checkin(UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_attendance_checkin_prompts() TO authenticated;
