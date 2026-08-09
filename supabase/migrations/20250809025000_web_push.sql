-- Web Push: store browser subscriptions and dispatch pushes via Edge Function.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_subscriptions_own ON push_subscriptions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

INSERT INTO app_config (key, value) VALUES
  ('supabase_project_url', '"https://iemlgwsnujyymuswsqeu.supabase.co"'),
  ('push_internal_secret', to_jsonb(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.dispatch_web_push(p_payload JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_base_url TEXT;
  v_secret TEXT;
  v_body JSONB;
BEGIN
  SELECT trim(both '"' from value::text) INTO v_base_url
  FROM app_config WHERE key = 'supabase_project_url';

  SELECT trim(both '"' from value::text) INTO v_secret
  FROM app_config WHERE key = 'push_internal_secret';

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RETURN;
  END IF;

  v_body := p_payload || jsonb_build_object('secret', v_secret);

  PERFORM net.http_post(
    url := v_base_url || '/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', v_secret
    ),
    body := v_body
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_notifications_web_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM dispatch_web_push(jsonb_build_object(
    'user_id', NEW.user_id,
    'title', NEW.title,
    'body', NEW.body,
    'tag', 'alert-' || NEW.id::text,
    'kind', 'alert',
    'notification_type', NEW.type,
    'activity_id', NEW.activity_id,
    'join_request_id', NEW.join_request_id
  ));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_web_push ON notifications;
CREATE TRIGGER notifications_web_push
  AFTER INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_notifications_web_push();

CREATE OR REPLACE FUNCTION public.trg_messages_web_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
  v_activity_title TEXT;
  v_sender_name TEXT;
  v_recipient UUID;
  v_title TEXT;
  v_body TEXT;
BEGIN
  IF NEW.sender_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT c.activity_id, a.title
  INTO v_activity_id, v_activity_title
  FROM conversations c
  JOIN activities a ON a.id = c.activity_id
  WHERE c.id = NEW.conversation_id;

  IF v_activity_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT display_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_user_id;
  v_sender_name := COALESCE(NULLIF(trim(v_sender_name), ''), 'Someone');

  IF NEW.type = 'poll' THEN
    v_title := v_sender_name || ' · ' || COALESCE(v_activity_title, 'Activity chat');
    v_body := 'Sent a poll';
  ELSIF NEW.type = 'system' THEN
    v_title := 'Activity update';
    v_body := NEW.body;
  ELSE
    v_title := v_sender_name || ' · ' || COALESCE(v_activity_title, 'Activity chat');
    v_body := NEW.body;
  END IF;

  FOR v_recipient IN
    SELECT DISTINCT user_id FROM (
      SELECT host_user_id AS user_id FROM activities WHERE id = v_activity_id
      UNION
      SELECT user_id FROM participations
      WHERE activity_id = v_activity_id AND status = 'confirmed' AND user_id IS NOT NULL
    ) recipients
    WHERE user_id IS NOT NULL AND user_id != NEW.sender_user_id
  LOOP
    PERFORM dispatch_web_push(jsonb_build_object(
      'user_id', v_recipient,
      'title', v_title,
      'body', v_body,
      'tag', 'chat-' || v_activity_id::text,
      'kind', 'chat',
      'activity_id', v_activity_id
    ));
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_web_push ON messages;
CREATE TRIGGER messages_web_push
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trg_messages_web_push();
