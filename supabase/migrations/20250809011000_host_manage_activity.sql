-- Host participant removal and attendee notifications on activity updates

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'activity_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'participant_removed';

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

  RETURN jsonb_build_object('data', jsonb_build_object('ok', true));
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_activity_participants_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_details_changed BOOLEAN;
BEGIN
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('published', 'draft') THEN
    RETURN NEW;
  END IF;

  v_details_changed := (
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.starts_at IS DISTINCT FROM NEW.starts_at OR
    OLD.duration_minutes IS DISTINCT FROM NEW.duration_minutes OR
    OLD.location_id IS DISTINCT FROM NEW.location_id OR
    OLD.capacity IS DISTINCT FROM NEW.capacity OR
    OLD.cost_amount IS DISTINCT FROM NEW.cost_amount OR
    OLD.cost_note IS DISTINCT FROM NEW.cost_note OR
    OLD.skill_level IS DISTINCT FROM NEW.skill_level OR
    OLD.equipment_note IS DISTINCT FROM NEW.equipment_note OR
    OLD.equipment_provided IS DISTINCT FROM NEW.equipment_provided OR
    OLD.cover_image_ref IS DISTINCT FROM NEW.cover_image_ref OR
    OLD.category_id IS DISTINCT FROM NEW.category_id
  );

  IF NOT v_details_changed THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS DISTINCT FROM NEW.host_user_id THEN
    RETURN NEW;
  END IF;

  FOR v_participant IN
    SELECT user_id
    FROM participations
    WHERE activity_id = NEW.id
      AND status = 'confirmed'
      AND user_id IS NOT NULL
      AND user_id != NEW.host_user_id
  LOOP
    PERFORM create_notification(
      v_participant.user_id,
      'activity_updated',
      'Activity updated',
      NEW.title || ' has new details. Tap to view.',
      NEW.id,
      NULL,
      NEW.host_user_id,
      '{}'::jsonb
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activities_notify_participants_on_update ON activities;
CREATE TRIGGER activities_notify_participants_on_update
  AFTER UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION notify_activity_participants_on_update();
