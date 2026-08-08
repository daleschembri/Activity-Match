-- Add gender to user profiles (date_of_birth already exists)

CREATE TYPE profile_gender AS ENUM (
  'woman',
  'man',
  'non_binary',
  'prefer_not_to_say'
);

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS gender profile_gender;
