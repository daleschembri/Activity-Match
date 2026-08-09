-- Post-activity attendance, feedback outcomes, and disputes

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS attendance_resolved_at TIMESTAMPTZ;

CREATE TYPE feedback_outcome AS ENUM ('yes', 'partial', 'no');

ALTER TABLE activity_feedback
  ALTER COLUMN rating DROP NOT NULL;

ALTER TABLE activity_feedback
  ADD COLUMN IF NOT EXISTS outcome feedback_outcome;

CREATE TABLE attendance_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participation_id UUID NOT NULL REFERENCES participations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (activity_id, user_id)
);

ALTER TABLE attendance_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_disputes_own ON attendance_disputes
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'attendance_record_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'attendance_dispute_submitted';

CREATE OR REPLACE FUNCTION public.recalculate_reliability(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
    last_recalculated_at = now()
  WHERE user_id = p_user_id;
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

  PERFORM recalculate_reliability(u) FROM unnest(v_affected_users) AS u;

  RETURN jsonb_build_object(
    'attended_count', v_attended_count,
    'total_count', v_total
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_attendance_outcome(
  p_activity_id UUID,
  p_accepted BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_participation participations%ROWTYPE;
  v_activity activities%ROWTYPE;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_participation
  FROM participations
  WHERE activity_id = p_activity_id
    AND user_id = v_user_id
    AND status = 'no_show';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No attendance outcome to respond to';
  END IF;

  SELECT * INTO v_activity FROM activities WHERE id = p_activity_id;

  IF p_accepted THEN
    RETURN;
  END IF;

  INSERT INTO attendance_disputes (activity_id, user_id, participation_id)
  VALUES (p_activity_id, v_user_id, v_participation.id)
  ON CONFLICT (activity_id, user_id) DO NOTHING;

  PERFORM create_notification(
    v_activity.host_user_id,
    'attendance_dispute_submitted',
    'Attendance under review',
    'A participant has asked us to review the attendance record for ' || v_activity.title || '.',
    p_activity_id,
    NULL,
    v_user_id,
    '{}'::jsonb
  );
END;
$$;
