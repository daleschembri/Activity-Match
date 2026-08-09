-- Backfill post-event prompts for activities that already ended (enum values committed in prior migration)
SELECT send_post_event_prompts();
