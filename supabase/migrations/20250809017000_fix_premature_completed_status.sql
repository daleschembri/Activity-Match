-- Do not mark activities completed until attendance is resolved.
-- "completed" means attendance was marked (manually or after the grace period).

CREATE OR REPLACE FUNCTION public.send_post_event_prompts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_participant RECORD;
BEGIN
  FOR v_activity IN
    SELECT *
    FROM activities
    WHERE status = 'published'
      AND post_event_prompt_sent_at IS NULL
      AND starts_at IS NOT NULL
      AND starts_at + (COALESCE(duration_minutes, 60) || ' minutes')::interval < now()
      AND participation_count(id) > 0
  LOOP
    IF v_activity.attendance_resolved_at IS NULL THEN
      PERFORM create_notification(
        v_activity.host_user_id,
        'attendance_mark_reminder',
        'Mark attendance',
        'How did ' || v_activity.title || ' go? Update who came along.',
        v_activity.id,
        NULL,
        NULL,
        '{}'::jsonb
      );
    END IF;

    FOR v_participant IN
      SELECT user_id
      FROM participations
      WHERE activity_id = v_activity.id
        AND status IN ('confirmed', 'attended')
        AND user_id IS NOT NULL
        AND user_id != v_activity.host_user_id
    LOOP
      PERFORM create_notification(
        v_participant.user_id,
        'feedback_prompt',
        'How was it?',
        'Share quick feedback for ' || v_activity.title || '.',
        v_activity.id,
        NULL,
        NULL,
        '{}'::jsonb
      );
    END LOOP;

    UPDATE activities SET
      post_event_prompt_sent_at = now(),
      updated_at = now()
    WHERE id = v_activity.id;
  END LOOP;
END;
$$;

-- Restore activities that were prematurely marked completed.
UPDATE activities
SET status = 'published', updated_at = now()
WHERE status = 'completed'
  AND attendance_resolved_at IS NULL;
