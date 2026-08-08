-- In-app notifications for join requests and acceptances

CREATE TYPE notification_type AS ENUM (
  'join_request_received',
  'join_request_accepted',
  'join_request_declined',
  'join_request_waitlisted'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
  join_request_id UUID REFERENCES join_requests(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_read ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_body TEXT,
  p_activity_id UUID DEFAULT NULL,
  p_join_request_id UUID DEFAULT NULL,
  p_actor_user_id UUID DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO notifications (
    user_id, type, title, body, activity_id, join_request_id, actor_user_id, payload
  )
  VALUES (
    p_user_id, p_type, p_title, p_body, p_activity_id, p_join_request_id, p_actor_user_id, p_payload
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_join_request_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity activities%ROWTYPE;
  v_actor_name TEXT;
BEGIN
  SELECT * INTO v_activity FROM activities WHERE id = COALESCE(NEW.activity_id, OLD.activity_id);
  IF NOT FOUND OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_actor_name FROM profiles WHERE id = NEW.user_id;
  v_actor_name := COALESCE(v_actor_name, 'Someone');

  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'pending' AND v_activity.acceptance_mode != 'auto' THEN
      PERFORM create_notification(
        v_activity.host_user_id,
        'join_request_received',
        'New join request',
        v_actor_name || ' wants to join ' || v_activity.title,
        NEW.activity_id,
        NEW.id,
        NEW.user_id,
        jsonb_build_object('introduction', NEW.introduction)
      );
    ELSIF NEW.status = 'waitlisted' THEN
      PERFORM create_notification(
        v_activity.host_user_id,
        'join_request_received',
        'New waitlist request',
        v_actor_name || ' joined the waitlist for ' || v_activity.title,
        NEW.activity_id,
        NEW.id,
        NEW.user_id,
        jsonb_build_object('introduction', NEW.introduction)
      );
      PERFORM create_notification(
        NEW.user_id,
        'join_request_waitlisted',
        'Added to waitlist',
        'You are on the waitlist for ' || v_activity.title || '.',
        NEW.activity_id,
        NEW.id,
        NULL,
        '{}'::jsonb
      );
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'accepted' THEN
      PERFORM create_notification(
        NEW.user_id,
        'join_request_accepted',
        'Request accepted',
        'You have been accepted into ' || v_activity.title || '!',
        NEW.activity_id,
        NEW.id,
        v_activity.host_user_id,
        '{}'::jsonb
      );

      IF v_activity.acceptance_mode = 'auto' THEN
        PERFORM create_notification(
          v_activity.host_user_id,
          'join_request_received',
          'New participant',
          v_actor_name || ' joined ' || v_activity.title,
          NEW.activity_id,
          NEW.id,
          NEW.user_id,
          jsonb_build_object('introduction', NEW.introduction)
        );
      END IF;
    ELSIF NEW.status = 'declined' THEN
      PERFORM create_notification(
        NEW.user_id,
        'join_request_declined',
        'Request declined',
        'Your request to join ' || v_activity.title || ' was declined.',
        NEW.activity_id,
        NEW.id,
        v_activity.host_user_id,
        '{}'::jsonb
      );
    ELSIF NEW.status = 'waitlisted' AND OLD.status = 'pending' THEN
      PERFORM create_notification(
        NEW.user_id,
        'join_request_waitlisted',
        'Added to waitlist',
        'You have been added to the waitlist for ' || v_activity.title || '.',
        NEW.activity_id,
        NEW.id,
        v_activity.host_user_id,
        '{}'::jsonb
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER join_requests_notify
  AFTER INSERT OR UPDATE OF status ON join_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_join_request_changes();
