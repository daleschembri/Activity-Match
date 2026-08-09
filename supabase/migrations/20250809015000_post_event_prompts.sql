-- Post-event host attendance reminder and participant feedback prompts

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS post_event_prompt_sent_at TIMESTAMPTZ;

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'attendance_mark_reminder';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'feedback_prompt';

CREATE TYPE feedback_sentiment AS ENUM ('up', 'down');

ALTER TABLE activity_feedback
  ADD COLUMN IF NOT EXISTS sentiment feedback_sentiment;

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
    WHERE status IN ('published', 'completed')
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
      status = 'completed',
      post_event_prompt_sent_at = now(),
      updated_at = now()
    WHERE id = v_activity.id;
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

  PERFORM send_post_event_prompts();

  PERFORM finalize_completed_activities();
END;
$$;
