-- Fix activity publish: RLS gaps + participations infinite recursion + trigger privileges

CREATE OR REPLACE FUNCTION public.is_confirmed_participant(p_activity_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM participations
    WHERE activity_id = p_activity_id
      AND user_id = p_user_id
      AND status = 'confirmed'
  );
$$;

DROP POLICY IF EXISTS participations_read ON participations;
CREATE POLICY participations_read ON participations
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id AND a.host_user_id = auth.uid()
    )
    OR is_confirmed_participant(activity_id, auth.uid())
  );

DROP POLICY IF EXISTS locations_read ON locations;
CREATE POLICY locations_read ON locations
  FOR SELECT
  USING (is_public_place = true);

DROP POLICY IF EXISTS conversations_read ON conversations;
CREATE POLICY conversations_read ON conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = conversations.activity_id
        AND (
          a.host_user_id = auth.uid()
          OR a.status IN ('published', 'completed', 'cancelled', 'expired')
        )
    )
    OR is_confirmed_participant(conversations.activity_id, auth.uid())
  );

DROP POLICY IF EXISTS conversations_insert_host ON conversations;
CREATE POLICY conversations_insert_host ON conversations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id AND a.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS participations_insert_host ON participations;
CREATE POLICY participations_insert_host ON participations
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM activities a
      WHERE a.id = activity_id AND a.host_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages
  FOR INSERT
  WITH CHECK (
    sender_user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM conversations c
        JOIN participations p ON p.activity_id = c.activity_id
        WHERE c.id = conversation_id
          AND p.user_id = auth.uid()
          AND p.status = 'confirmed'
      )
      OR EXISTS (
        SELECT 1 FROM conversations c
        JOIN activities a ON a.id = c.activity_id
        WHERE c.id = conversation_id AND a.host_user_id = auth.uid()
      )
    )
  );

CREATE OR REPLACE FUNCTION public.create_activity_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status = 'draft' THEN
    INSERT INTO conversations (activity_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;

    IF NOT EXISTS (SELECT 1 FROM conversations WHERE activity_id = NEW.id) THEN
      INSERT INTO conversations (activity_id) VALUES (NEW.id);
    END IF;

    IF NEW.host_is_participating THEN
      INSERT INTO participations (activity_id, user_id, status)
      VALUES (NEW.id, NEW.host_user_id, 'confirmed')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
