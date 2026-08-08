-- =============================================================================
-- Activity Match — one-shot database bootstrap
-- Project: iemlgwsnujyymuswsqeu
-- Run in: https://supabase.com/dashboard/project/iemlgwsnujyymuswsqeu/sql/new
--
-- If this says "profiles is missing", run first in terminal:
--   supabase link --project-ref iemlgwsnujyymuswsqeu
--   supabase db push
-- =============================================================================

-- 1. Extensions (required for geography / location fields)
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Confirm schema exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'Table public.profiles is missing. Run "supabase db push" first.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'reliability_records'
  ) THEN
    RAISE EXCEPTION 'Table public.reliability_records is missing. Run "supabase db push" first.';
  END IF;
END $$;

-- 3. Signup trigger: create profile + reliability row for each new auth user
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
    ST_SetSRID(ST_MakePoint(0, 0), 4326)::geography,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data->>'home_area_label'), ''), 'Unknown')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.reliability_records (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'handle_new_user failed: %', SQLERRM;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. RLS policies for profile rows
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reliability_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_read ON public.profiles;
CREATE POLICY profiles_read ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS reliability_read ON public.reliability_records;
CREATE POLICY reliability_read ON public.reliability_records
  FOR SELECT USING (true);

DROP POLICY IF EXISTS reliability_insert_own ON public.reliability_records;
CREATE POLICY reliability_insert_own ON public.reliability_records
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. Done
SELECT 'Bootstrap complete — delete old users in Auth → Users, then sign up again.' AS status;
