-- Callable lifecycle hook so post-event notifications fire without a cron job.

CREATE OR REPLACE FUNCTION public.process_activity_lifecycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM expire_activities();
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_activity_lifecycle() TO authenticated;

-- Process any activities that ended before this hook existed.
SELECT send_post_event_prompts();
