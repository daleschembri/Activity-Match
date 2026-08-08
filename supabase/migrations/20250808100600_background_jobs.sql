-- Background jobs and promotion operations
CREATE OR REPLACE FUNCTION expire_activities()
RETURNS void AS $$
BEGIN
  UPDATE activities SET status = 'expired', updated_at = now()
  WHERE status = 'published'
    AND listing_type = 'confirmed'
    AND starts_at IS NOT NULL
    AND starts_at < now()
    AND participation_count(id) = 0;

  UPDATE activities SET status = 'completed', updated_at = now()
  WHERE status = 'published'
    AND starts_at IS NOT NULL
    AND starts_at + (COALESCE(duration_minutes, 60) || ' minutes')::interval < now()
    AND participation_count(id) > 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION promote_proposal_to_confirmed(
  p_activity_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_location_id UUID,
  p_capacity INTEGER,
  p_host_id UUID
) RETURNS JSONB AS $$
BEGIN
  UPDATE activities SET
    listing_type = 'confirmed',
    starts_at = p_starts_at,
    location_id = p_location_id,
    capacity = p_capacity,
    updated_at = now()
  WHERE id = p_activity_id AND host_user_id = p_host_id AND listing_type = 'proposed';

  UPDATE join_requests SET status = 'pending', intent = 'join'
  WHERE activity_id = p_activity_id AND intent = 'interest';

  RETURN jsonb_build_object('data', jsonb_build_object('activity_id', p_activity_id));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_group_sessions()
RETURNS void AS $$
DECLARE
  g RECORD;
  horizon INTERVAL := '4 weeks';
BEGIN
  FOR g IN SELECT * FROM activity_groups WHERE status = 'active' LOOP
    IF g.last_session_at IS NULL OR g.last_session_at < now() - interval '7 days' THEN
      INSERT INTO activities (
        host_user_id, group_id, listing_type, title, description, category_id,
        starts_at, duration_minutes, location_id, capacity, status, published_at
      )
      SELECT
        g.owner_user_id, g.id, 'confirmed', g.name || ' Session', COALESCE(g.description, ''),
        g.category_id, now() + interval '7 days', 120, g.default_location_id, g.target_size,
        'published', now()
      WHERE NOT EXISTS (
        SELECT 1 FROM activities a
        WHERE a.group_id = g.id AND a.starts_at > now() AND a.starts_at < now() + horizon
      );
      UPDATE activity_groups SET last_session_at = now() WHERE id = g.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION resolve_attendance(p_activity_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE participations SET status = 'attended'
  WHERE activity_id = p_activity_id
    AND status = 'confirmed'
    AND attendance_confirmed_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
