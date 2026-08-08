-- Seed categories and config
INSERT INTO app_config (key, value) VALUES
  ('waitlist_claim_window_max_minutes', '120'),
  ('waitlist_claim_window_min_minutes', '15'),
  ('late_cancellation_threshold_hours', '12'),
  ('host_late_cancellation_threshold_hours', '24'),
  ('attendance_grace_period_hours', '2'),
  ('host_attendance_correction_window_hours', '48'),
  ('left_swipe_suppression_days', '30'),
  ('new_activity_boost_hours', '24'),
  ('feed_bucket_shares', '{"familiar": 0.7, "adjacent": 0.2, "wildcard": 0.1}'),
  ('feed_max_per_host', '3'),
  ('feed_max_per_category', '5'),
  ('group_dormancy_days', '90'),
  ('guest_token_ttl_days_after_completion', '7'),
  ('reliability_visibility_min_activities', '3'),
  ('reliability_decay_months', '12'),
  ('travel_speed_kmh', '30'),
  ('session_generation_horizon_weeks', '4')
ON CONFLICT (key) DO NOTHING;

INSERT INTO categories (name) VALUES
  ('Board Games'),
  ('Sports & Fitness'),
  ('Outdoor Adventures'),
  ('Food & Drink'),
  ('Arts & Culture'),
  ('Music & Nightlife'),
  ('Learning & Workshops'),
  ('Social Meetups'),
  ('Volunteering'),
  ('Family & Kids')
ON CONFLICT (name) DO NOTHING;

INSERT INTO tags (label, is_system) VALUES
  ('beginner-friendly', true),
  ('outdoors', true),
  ('indoors', true),
  ('weekly', true),
  ('casual', true),
  ('competitive', true),
  ('social', true),
  ('free', true)
ON CONFLICT (label) DO NOTHING;

-- Category adjacency examples
INSERT INTO category_adjacency (category_id, adjacent_category_id)
SELECT c1.id, c2.id FROM categories c1, categories c2
WHERE c1.name = 'Board Games' AND c2.name IN ('Social Meetups', 'Food & Drink')
ON CONFLICT DO NOTHING;

INSERT INTO locations (name, area_label, point, timezone) VALUES
  ('Community Centre', 'St Paul''s Bay', ST_SetSRID(ST_MakePoint(14.408, 35.948), 4326)::geography, 'Europe/Malta'),
  ('Waterfront Park', 'Sliema', ST_SetSRID(ST_MakePoint(14.502, 35.912), 4326)::geography, 'Europe/Malta'),
  ('Local Cafe', 'Valletta', ST_SetSRID(ST_MakePoint(14.514, 35.898), 4326)::geography, 'Europe/Malta');
