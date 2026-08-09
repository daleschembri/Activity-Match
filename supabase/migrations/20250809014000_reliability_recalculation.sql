-- Fix reliability: auto-resolve attendance after events end and recalculate all counts

CREATE OR REPLACE FUNCTION public.recalculate_reliability(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO reliability_records (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE reliability_records SET
    attended_count = (
      SELECT COUNT(*)::integer FROM participations
      WHERE user_id = p_user_id AND status = 'attended'
    ),
    no_show_count = (
      SELECT COUNT(*)::integer FROM participations
      WHERE user_id = p_user_id AND status = 'no_show'
    ),
    late_cancellation_count = (
      SELECT COUNT(*)::integer FROM participations
      WHERE user_id = p_user_id AND is_late_cancellation = true
    ),
    hosted_count = (
      SELECT COUNT(*)::integer FROM activities
      WHERE host_user_id = p_user_id AND status = 'completed'
    ),
    hosted_cancelled_count = (
      SELECT COUNT(*)::integer FROM activities
      WHERE host_user_id = p_user_id AND status = 'cancelled'
    ),
    last_recalculated_at = now()
  WHERE user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_resolve_activity_attendance(p_activity_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_user_id UUID;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id FOR UPDATE;
  IF NOT FOUND OR v_activity.attendance_resolved_at IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE participations SET status = 'attended'
  WHERE activity_id = p_activity_id
    AND status = 'confirmed';

  UPDATE activities SET
    status = 'completed',
    attendance_resolved_at = now(),
    updated_at = now()
  WHERE id = p_activity_id;

  PERFORM recalculate_reliability(v_activity.host_user_id);

  FOR v_user_id IN
    SELECT DISTINCT user_id
    FROM participations
    WHERE activity_id = p_activity_id
      AND user_id IS NOT NULL
      AND status IN ('attended', 'no_show')
  LOOP
    PERFORM recalculate_reliability(v_user_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_completed_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grace_hours INTEGER;
  v_activity_id UUID;
BEGIN
  SELECT COALESCE((value::text)::integer, 2) INTO v_grace_hours
  FROM app_config WHERE key = 'attendance_grace_period_hours';

  FOR v_activity_id IN
    SELECT id
    FROM activities
    WHERE status IN ('published', 'completed')
      AND starts_at IS NOT NULL
      AND attendance_resolved_at IS NULL
      AND starts_at
          + (COALESCE(duration_minutes, 60) || ' minutes')::interval
          + (v_grace_hours || ' hours')::interval < now()
  LOOP
    PERFORM auto_resolve_activity_attendance(v_activity_id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_activities()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE activities SET status = 'expired', updated_at = now()
  WHERE status = 'published'
    AND listing_type = 'confirmed'
    AND starts_at IS NOT NULL
    AND starts_at < now()
    AND participation_count(id) = 0;

  UPDATE activities SET status = 'completed', updated_at = now()
  WHERE status = 'published'
    AND starts_at IS NOT NULL
    AND starts_at + (COALESCE(duration_minutes, 60) || ' minutes')::interval < now()
    AND participation_count(id) > 0;

  PERFORM finalize_completed_activities();
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_attendance(
  p_activity_id UUID,
  p_marks JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
  v_activity activities%ROWTYPE;
  v_correction_hours INTEGER;
  v_end_at TIMESTAMPTZ;
  v_deadline TIMESTAMPTZ;
  v_mark JSONB;
  v_user_id UUID;
  v_attended BOOLEAN;
  v_old_status participation_status;
  v_attended_count INTEGER := 0;
  v_total INTEGER := 0;
  v_affected_users UUID[] := ARRAY[]::UUID[];
BEGIN
  v_host_id := auth.uid();
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activity not found';
  END IF;
  IF v_activity.host_user_id != v_host_id THEN
    RAISE EXCEPTION 'Only the host can mark attendance';
  END IF;

  IF v_activity.starts_at IS NULL THEN
    RAISE EXCEPTION 'Activity has no scheduled time';
  END IF;

  v_end_at := v_activity.starts_at + (COALESCE(v_activity.duration_minutes, 60) || ' minutes')::interval;
  IF v_end_at > now() THEN
    RAISE EXCEPTION 'Activity has not ended yet';
  END IF;

  SELECT COALESCE((value::text)::integer, 48) INTO v_correction_hours
  FROM app_config WHERE key = 'host_attendance_correction_window_hours';
  v_deadline := v_end_at + (v_correction_hours || ' hours')::interval;

  IF now() > v_deadline THEN
    RAISE EXCEPTION 'Attendance correction window has closed';
  END IF;

  FOR v_mark IN SELECT * FROM jsonb_array_elements(p_marks) LOOP
    v_user_id := (v_mark->>'user_id')::UUID;
    v_attended := COALESCE((v_mark->>'attended')::boolean, true);

    SELECT status INTO v_old_status
    FROM participations
    WHERE activity_id = p_activity_id
      AND user_id = v_user_id
      AND status IN ('confirmed', 'attended', 'no_show');

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    UPDATE participations SET
      status = CASE
        WHEN v_attended THEN 'attended'::participation_status
        ELSE 'no_show'::participation_status
      END
    WHERE activity_id = p_activity_id AND user_id = v_user_id;

    v_total := v_total + 1;
    IF v_attended THEN
      v_attended_count := v_attended_count + 1;
    END IF;

    IF NOT v_user_id = ANY(v_affected_users) THEN
      v_affected_users := array_append(v_affected_users, v_user_id);
    END IF;

    IF NOT v_attended AND v_old_status IS DISTINCT FROM 'no_show' THEN
      PERFORM create_notification(
        v_user_id,
        'attendance_record_updated',
        'Attendance record updated',
        'The host updated your attendance record for ' || v_activity.title || '.',
        p_activity_id,
        NULL,
        v_host_id,
        '{}'::jsonb
      );
    END IF;
  END LOOP;

  UPDATE activities SET
    attendance_resolved_at = now(),
    status = 'completed',
    updated_at = now()
  WHERE id = p_activity_id;

  PERFORM recalculate_reliability(v_host_id);
  PERFORM recalculate_reliability(u) FROM unnest(v_affected_users) AS u;

  RETURN jsonb_build_object(
    'attended_count', v_attended_count,
    'total_count', v_total
  );
END;
$$;

-- Backfill existing completed/past activities and reliability rows
SELECT finalize_completed_activities();

SELECT recalculate_reliability(user_id)
FROM (
  SELECT DISTINCT user_id
  FROM participations
  WHERE user_id IS NOT NULL
  UNION
  SELECT DISTINCT host_user_id AS user_id
  FROM activities
) AS users_needing_recalc;
