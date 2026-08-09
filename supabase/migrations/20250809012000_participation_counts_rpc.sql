-- Public participation counts for capacity display (RLS hides participant rows from non-members)

CREATE OR REPLACE FUNCTION public.get_participation_counts(p_activity_ids UUID[])
RETURNS TABLE(activity_id UUID, participant_count INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.activity_id, COUNT(*)::INTEGER AS participant_count
  FROM participations p
  JOIN activities a ON a.id = p.activity_id
  WHERE p.activity_id = ANY(p_activity_ids)
    AND p.status = 'confirmed'
    AND a.status IN ('published', 'completed')
  GROUP BY p.activity_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_participation_counts(UUID[]) TO authenticated, anon;
