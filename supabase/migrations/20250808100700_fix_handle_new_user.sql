-- Fix signup trigger: PostGIS search_path + display_name length constraint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_name TEXT;
BEGIN
  v_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'display_name'), ''),
    NULLIF(split_part(COALESCE(NEW.email, ''), '@', 1), ''),
    'User'
  );

  IF char_length(v_name) < 2 THEN
    v_name := 'User';
  END IF;

  v_name := left(v_name, 40);

  INSERT INTO public.profiles (id, display_name, home_location, home_area_label)
  VALUES (
    NEW.id,
    v_name,
    extensions.ST_SetSRID(extensions.ST_MakePoint(0, 0), 4326)::geography,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'home_area_label'), ''), 'Unknown')
  );

  INSERT INTO public.reliability_records (user_id) VALUES (NEW.id);

  RETURN NEW;
END;
$$;

-- Ensure trigger exists (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Allow service/trigger inserts if RLS interferes
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS reliability_insert_own ON reliability_records;
CREATE POLICY reliability_insert_own ON reliability_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);
