-- Demo activities seed: varied hosts and dates (today, tomorrow, later this week).
-- Run: supabase db query --linked -f supabase/seed/demo_activities.sql

BEGIN;

CREATE TEMP TABLE seed_activity_batch (
  host_user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_name TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  location_id UUID NOT NULL,
  capacity INTEGER NOT NULL,
  cost_amount NUMERIC NOT NULL DEFAULT 0,
  skill_level skill_level NOT NULL DEFAULT 'any',
  acceptance_mode acceptance_mode NOT NULL DEFAULT 'auto',
  listing_type listing_type NOT NULL DEFAULT 'confirmed'
) ON COMMIT DROP;

INSERT INTO seed_activity_batch (
  host_user_id, title, description, category_name, starts_at, duration_minutes,
  location_id, capacity, cost_amount, skill_level, acceptance_mode, listing_type
) VALUES
  -- Today (Sun 9 Aug 2026)
  ('d3a5596f-cf3b-4462-b7ad-304aeb20996b', 'Morning Coastal Jog',
   'Easy 5k along the Sliema promenade. All paces welcome — we regroup at the fountains.',
   'Sports & Fitness', '2026-08-09 07:30:00+02', 60,
   'a094043d-27f4-4b9d-a6a5-ba1df82c5afd', 10, 0, 'beginner', 'auto', 'confirmed'),

  ('c2c4cfef-b708-439d-aa03-b2f7f6c275d9', 'Sunday Board Games Café',
   'Bring a favourite game or jump into ours. Relaxed afternoon with coffee and snacks.',
   'Board Games', '2026-08-09 15:00:00+02', 180,
   '78da1bdc-63dc-4944-b967-01151dca71bb', 8, 5, 'any', 'auto', 'confirmed'),

  ('8fa37da8-5f8d-4584-9401-0e7bf55b6e64', 'Golden Hour Coastal Walk',
   'Stroll the waterfront as the sun sets. Great for photos and casual conversation.',
   'Outdoor Adventures', '2026-08-09 19:00:00+02', 90,
   'a094043d-27f4-4b9d-a6a5-ba1df82c5afd', 12, 0, 'any', 'approval', 'confirmed'),

  ('cb111a56-3c94-4729-883d-2a12c02bb6e9', 'Evening Social Mixer',
   'Low-key meetup for new faces in Valletta. Name tags, icebreakers, no pressure.',
   'Social Meetups', '2026-08-09 20:30:00+02', 120,
   '78da1bdc-63dc-4944-b967-01151dca71bb', 15, 0, 'any', 'auto', 'confirmed'),

  -- Tomorrow (Mon 10 Aug)
  ('9a56bbdf-1d34-4e66-b2ce-db356028d926', 'Sunrise Yoga in the Park',
   'Gentle vinyasa flow outdoors. Bring a mat and water.',
   'Sports & Fitness', '2026-08-10 06:45:00+02', 75,
   '707a1d80-94ab-4ea1-b5ca-64b5354b1a67', 12, 0, 'beginner', 'auto', 'confirmed'),

  ('03b3fcb7-0518-4138-b7a0-2240b9c5765a', 'Padel Doubles Session',
   'Intermediate-friendly padel. Courts booked — split the fee on arrival.',
   'Sports & Fitness', '2026-08-10 17:00:00+02', 90,
   '5126c004-cc68-4589-ba64-af9047368667', 4, 12, 'intermediate', 'approval', 'confirmed'),

  ('fde11959-e258-4a26-a328-83abc608f2c4', 'Valletta Street Food Crawl',
   'Four stops, shared plates. Vegetarian options at each spot.',
   'Food & Drink', '2026-08-10 19:00:00+02', 150,
   '78da1bdc-63dc-4944-b967-01151dca71bb', 8, 25, 'any', 'auto', 'confirmed'),

  ('cbf7119f-888f-4290-aabb-21fe02edf549', 'Monday Coffee & Cowork',
   'Quiet café session for remote workers who want company between focus blocks.',
   'Social Meetups', '2026-08-10 10:00:00+02', 180,
   '78da1bdc-63dc-4944-b967-01151dca71bb', 6, 0, 'any', 'auto', 'confirmed'),

  -- Tuesday 12 Aug
  ('d3a5596f-cf3b-4462-b7ad-304aeb20996b', 'Photography Walk: Old Valletta',
   'Practice street photography in golden light. Any camera or phone is fine.',
   'Arts & Culture', '2026-08-12 09:00:00+02', 120,
   '78da1bdc-63dc-4944-b967-01151dca71bb', 10, 0, 'any', 'auto', 'confirmed'),

  ('8fa37da8-5f8d-4584-9401-0e7bf55b6e64', 'Pottery Taster Workshop',
   'Hand-build a small bowl with a local instructor. Materials included.',
   'Learning & Workshops', '2026-08-12 14:00:00+02', 120,
   '707a1d80-94ab-4ea1-b5ca-64b5354b1a67', 8, 18, 'beginner', 'approval', 'confirmed'),

  ('c2c4cfef-b708-439d-aa03-b2f7f6c275d9', 'Beach Volleyball Pick-up',
   'Casual sets on the sand. Teams formed on the spot.',
   'Sports & Fitness', '2026-08-12 18:00:00+02', 120,
   'a094043d-27f4-4b9d-a6a5-ba1df82c5afd', 12, 0, 'intermediate', 'auto', 'confirmed'),

  -- Wednesday 13 Aug
  ('9a56bbdf-1d34-4e66-b2ce-db356028d926', 'Book Club: August Pick',
   'Discussing this month''s novel over wine and snacks. Spoilers welcome after 8pm.',
   'Social Meetups', '2026-08-13 18:30:00+02', 120,
   '32cdc123-fcbe-48dc-a383-d208f01dae92', 10, 0, 'any', 'approval', 'confirmed'),

  ('cb111a56-3c94-4729-883d-2a12c02bb6e9', 'Dingli Cliffs Trail Run',
   'Moderate trail with stunning views. Trail shoes recommended.',
   'Outdoor Adventures', '2026-08-13 06:30:00+02', 75,
   '5126c004-cc68-4589-ba64-af9047368667', 8, 0, 'intermediate', 'auto', 'confirmed'),

  ('fde11959-e258-4a26-a328-83abc608f2c4', 'Trivia Night at the Community Centre',
   'Teams of up to 4. Prizes for top two tables.',
   'Social Meetups', '2026-08-13 20:00:00+02', 150,
   '32cdc123-fcbe-48dc-a383-d208f01dae92', 24, 3, 'any', 'auto', 'confirmed'),

  -- Thursday 14 Aug
  ('03b3fcb7-0518-4138-b7a0-2240b9c5765a', 'Open Mic & Acoustic Jam',
   'Singers and instrumentalists welcome. Sign up on the door.',
   'Music & Nightlife', '2026-08-14 21:00:00+02', 180,
   'a094043d-27f4-4b9d-a6a5-ba1df82c5afd', 20, 5, 'any', 'auto', 'confirmed'),

  ('cbf7119f-888f-4290-aabb-21fe02edf549', 'Community Beach Clean-up',
   'Gloves and bags provided. Stay for a swim afterwards if you like.',
   'Volunteering', '2026-08-14 08:00:00+02', 120,
   'a094043d-27f4-4b9d-a6a5-ba1df82c5afd', 30, 0, 'any', 'auto', 'confirmed'),

  ('d3a5596f-cf3b-4462-b7ad-304aeb20996b', 'Family Nature Scavenger Hunt',
   'Kid-friendly exploration in Attard gardens. Parents must accompany under-12s.',
   'Family & Kids', '2026-08-14 10:30:00+02', 90,
   '707a1d80-94ab-4ea1-b5ca-64b5354b1a67', 15, 0, 'any', 'approval', 'confirmed'),

  -- Friday 15 Aug
  ('8fa37da8-5f8d-4584-9401-0e7bf55b6e64', 'Farmers Market Brunch Meetup',
   'Browse stalls together then grab a table. Pay your own way.',
   'Food & Drink', '2026-08-15 09:30:00+02', 120,
   '707a1d80-94ab-4ea1-b5ca-64b5354b1a67', 10, 0, 'any', 'auto', 'confirmed'),

  ('9a56bbdf-1d34-4e66-b2ce-db356028d926', 'Saturday Cycling Group Ride',
   'Leisurely 25km loop starting from Sliema. Helmets required.',
   'Sports & Fitness', '2026-08-15 08:00:00+02', 150,
   'a094043d-27f4-4b9d-a6a5-ba1df82c5afd', 14, 0, 'intermediate', 'auto', 'confirmed'),

  ('cb111a56-3c94-4729-883d-2a12c02bb6e9', 'Dingli Stargazing Evening',
   'Bring a blanket. We''ll share constellations and hot chocolate.',
   'Outdoor Adventures', '2026-08-15 21:00:00+02', 120,
   '5126c004-cc68-4589-ba64-af9047368667', 12, 0, 'any', 'auto', 'confirmed'),

  ('c2c4cfef-b708-439d-aa03-b2f7f6c275d9', 'Weekend Hike: Dingli Countryside',
   'Full morning hike with a picnic stop. Moderate fitness needed.',
   'Outdoor Adventures', '2026-08-15 07:00:00+02', 240,
   '5126c004-cc68-4589-ba64-af9047368667', 10, 0, 'intermediate', 'approval', 'confirmed'),

  -- Proposed / flexible timing later in the week
  ('fde11959-e258-4a26-a328-83abc608f2c4', 'Weekend Padel League — Expressions of Interest',
   'Looking to gauge interest for a recurring Saturday padel group. Vote on preferred times in chat.',
   'Sports & Fitness', '2026-08-16 16:00:00+02', 120,
   '5126c004-cc68-4589-ba64-af9047368667', 8, 10, 'intermediate', 'approval', 'proposed'),

  ('03b3fcb7-0518-4138-b7a0-2240b9c5765a', 'Language Exchange Evening',
   'Practice Maltese, English, and Italian in rotating pairs. All levels welcome.',
   'Learning & Workshops', '2026-08-16 19:00:00+02', 90,
   '78da1bdc-63dc-4944-b967-01151dca71bb', 16, 0, 'any', 'auto', 'confirmed'),

  ('cbf7119f-888f-4290-aabb-21fe02edf549', 'Board Game Night — Strategy Edition',
   'Heavier games for experienced players: Terraforming Mars, Catan, and more.',
   'Board Games', '2026-08-11 19:00:00+02', 210,
   '32cdc123-fcbe-48dc-a383-d208f01dae92', 6, 0, 'advanced', 'approval', 'confirmed');

WITH inserted AS (
  INSERT INTO activities (
    host_user_id, listing_type, title, description, category_id,
    starts_at, duration_minutes, location_id, capacity,
    cost_amount, skill_level, acceptance_mode, visibility,
    status, host_is_participating
  )
  SELECT
    b.host_user_id,
    b.listing_type,
    b.title,
    b.description,
    c.id,
    b.starts_at,
    b.duration_minutes,
    b.location_id,
    b.capacity,
    b.cost_amount,
    b.skill_level,
    b.acceptance_mode,
    'public',
    'draft',
    true
  FROM seed_activity_batch b
  JOIN categories c ON c.name = b.category_name
  WHERE NOT EXISTS (
    SELECT 1 FROM activities a
    WHERE a.host_user_id = b.host_user_id
      AND a.title = b.title
      AND a.starts_at = b.starts_at
  )
  RETURNING id
),
published AS (
  UPDATE activities
  SET status = 'published',
      published_at = now()
  WHERE id IN (SELECT id FROM inserted)
  RETURNING id
)
SELECT COUNT(*) AS published_count FROM published;

-- Publish any seed rows that were inserted as draft on a prior run
CREATE OR REPLACE FUNCTION public._seed_publish_demo_activities()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE activities a
  SET status = 'published',
      published_at = COALESCE(a.published_at, now())
  FROM seed_activity_batch b
  JOIN categories c ON c.name = b.category_name
  WHERE a.host_user_id = b.host_user_id
    AND a.title = b.title
    AND a.starts_at = b.starts_at
    AND a.status = 'draft';

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

SELECT public._seed_publish_demo_activities() AS republished_count;

DROP FUNCTION public._seed_publish_demo_activities();

COMMIT;

-- Summary
SELECT
  p.display_name AS host,
  a.title,
  a.starts_at AT TIME ZONE 'Europe/Malta' AS starts_malta,
  a.capacity,
  a.acceptance_mode,
  a.listing_type
FROM activities a
JOIN profiles p ON p.id = a.host_user_id
WHERE a.published_at > now() - interval '5 minutes'
ORDER BY a.starts_at;
