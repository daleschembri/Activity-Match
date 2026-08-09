-- Allow chat members to update poll vote payloads (client fallback + RPC support).

CREATE POLICY messages_update_poll_vote ON messages
  FOR UPDATE
  USING (
    type = 'poll'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (
          EXISTS (
            SELECT 1 FROM activities a
            WHERE a.id = c.activity_id AND a.host_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM participations p
            WHERE p.activity_id = c.activity_id
              AND p.user_id = auth.uid()
              AND p.status IN ('confirmed', 'attended', 'no_show')
          )
        )
    )
  )
  WITH CHECK (type = 'poll');

-- Ensure vote RPC exists and handles poll payloads reliably.
CREATE OR REPLACE FUNCTION vote_chat_poll(p_message_id UUID, p_option_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message messages%ROWTYPE;
  v_activity_id UUID;
  v_payload JSONB;
  v_options JSONB;
  v_new_options JSONB := '[]'::jsonb;
  v_opt JSONB;
  v_votes JSONB;
  v_user_id UUID := auth.uid();
  v_allow_multiple BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT m.* INTO v_message
  FROM messages m
  WHERE m.id = p_message_id
    AND m.type = 'poll'
    AND m.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Poll not found';
  END IF;

  SELECT c.activity_id INTO v_activity_id
  FROM conversations c
  WHERE c.id = v_message.conversation_id;

  IF v_activity_id IS NULL OR NOT user_can_access_activity_chat(v_activity_id, v_user_id) THEN
    RAISE EXCEPTION 'Cannot access chat';
  END IF;

  v_payload := COALESCE(v_message.payload, '{}'::jsonb);
  v_options := COALESCE(v_payload->'options', '[]'::jsonb);
  v_allow_multiple := COALESCE((v_payload->>'allow_multiple')::boolean, false);

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_options) opt
    WHERE opt->>'id' = p_option_id
  ) THEN
    RAISE EXCEPTION 'Invalid poll option';
  END IF;

  FOR v_opt IN SELECT value FROM jsonb_array_elements(v_options)
  LOOP
    v_votes := COALESCE(v_opt->'votes', '[]'::jsonb);

    IF v_allow_multiple THEN
      IF v_opt->>'id' = p_option_id THEN
        IF EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(v_votes) uid
          WHERE uid = v_user_id::text
        ) THEN
          v_votes := (
            SELECT COALESCE(jsonb_agg(to_jsonb(uid)), '[]'::jsonb)
            FROM jsonb_array_elements_text(v_votes) uid
            WHERE uid <> v_user_id::text
          );
        ELSE
          v_votes := v_votes || to_jsonb(v_user_id::text);
        END IF;
      END IF;
    ELSE
      v_votes := (
        SELECT COALESCE(jsonb_agg(to_jsonb(uid)), '[]'::jsonb)
        FROM (
          SELECT uid
          FROM jsonb_array_elements_text(v_votes) uid
          WHERE uid <> v_user_id::text
        ) s
      );

      IF v_opt->>'id' = p_option_id THEN
        v_votes := v_votes || to_jsonb(v_user_id::text);
      END IF;
    END IF;

    v_new_options := v_new_options || jsonb_set(v_opt, '{votes}', v_votes, true);
  END LOOP;

  v_payload := jsonb_set(v_payload, '{options}', v_new_options, true);

  UPDATE messages
  SET payload = v_payload
  WHERE id = p_message_id;

  RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION vote_chat_poll(UUID, TEXT) TO authenticated;
