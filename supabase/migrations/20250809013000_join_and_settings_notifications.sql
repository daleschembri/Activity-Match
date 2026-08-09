-- Notify attendees when someone joins; keep acceptance-mode changes silent

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'participant_joined';

CREATE OR REPLACE FUNCTION public.notify_activity_participants_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participant RECORD;
  v_attendee_details_changed BOOLEAN;
BEGIN
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('published', 'draft') THEN
    RETURN NEW;
  END IF;

  -- Host settings (acceptance mode, participation toggle, etc.) never notify attendees.
  v_attendee_details_changed := (
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

  IF NOT v_attendee_details_changed THEN
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

CREATE OR REPLACE FUNCTION public.notify_participants_on_new_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_joiner_name TEXT;
  v_other RECORD;
BEGIN
  IF NEW.status != 'confirmed' OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_activity FROM activities WHERE id = NEW.activity_id;
  IF NOT FOUND OR v_activity.status != 'published' THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_joiner_name FROM profiles WHERE id = NEW.user_id;
  v_joiner_name := COALESCE(v_joiner_name, 'Someone');

  FOR v_other IN
    SELECT user_id
    FROM participations
    WHERE activity_id = NEW.activity_id
      AND status = 'confirmed'
      AND user_id IS NOT NULL
      AND user_id != NEW.user_id
      AND user_id != v_activity.host_user_id
  LOOP
    PERFORM create_notification(
      v_other.user_id,
      'participant_joined',
      'New participant',
      v_joiner_name || ' joined ' || v_activity.title || '.',
      NEW.activity_id,
      NULL,
      NEW.user_id,
      '{}'::jsonb
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS participations_notify_on_join ON participations;
CREATE TRIGGER participations_notify_on_join
  AFTER INSERT ON participations
  FOR EACH ROW
  EXECUTE FUNCTION notify_participants_on_new_join();
