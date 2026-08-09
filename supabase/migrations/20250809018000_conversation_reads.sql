-- Track per-user read state for activity chats and expose unread counts.

CREATE TABLE conversation_reads (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, conversation_id)
);

CREATE INDEX idx_conversation_reads_user ON conversation_reads(user_id);

ALTER TABLE conversation_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_reads_own ON conversation_reads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION user_can_access_activity_chat(p_activity_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM activities a
    WHERE a.id = p_activity_id
      AND a.host_user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM participations p
    WHERE p.activity_id = p_activity_id
      AND p.user_id = p_user_id
      AND p.status IN ('confirmed', 'attended', 'no_show')
  );
$$;

CREATE OR REPLACE FUNCTION get_unread_message_counts()
RETURNS TABLE(activity_id UUID, unread_count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.activity_id,
    COUNT(m.id)::bigint AS unread_count
  FROM conversations c
  JOIN messages m ON m.conversation_id = c.id
  LEFT JOIN conversation_reads cr
    ON cr.conversation_id = c.id
   AND cr.user_id = auth.uid()
  WHERE c.activity_id IS NOT NULL
    AND m.deleted_at IS NULL
    AND m.sender_user_id IS DISTINCT FROM auth.uid()
    AND (cr.last_read_at IS NULL OR m.created_at > cr.last_read_at)
    AND user_can_access_activity_chat(c.activity_id, auth.uid())
  GROUP BY c.activity_id;
$$;

CREATE OR REPLACE FUNCTION mark_conversation_read(p_activity_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_last_message_at TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT user_can_access_activity_chat(p_activity_id, auth.uid()) THEN
    RAISE EXCEPTION 'Cannot access chat';
  END IF;

  SELECT c.id INTO v_conv_id
  FROM conversations c
  WHERE c.activity_id = p_activity_id;

  IF v_conv_id IS NULL THEN
    RETURN;
  END IF;

  SELECT MAX(m.created_at) INTO v_last_message_at
  FROM messages m
  WHERE m.conversation_id = v_conv_id
    AND m.deleted_at IS NULL;

  INSERT INTO conversation_reads (user_id, conversation_id, last_read_at)
  VALUES (auth.uid(), v_conv_id, COALESCE(v_last_message_at, now()))
  ON CONFLICT (user_id, conversation_id)
  DO UPDATE SET last_read_at = GREATEST(
    conversation_reads.last_read_at,
    EXCLUDED.last_read_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_unread_message_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;
