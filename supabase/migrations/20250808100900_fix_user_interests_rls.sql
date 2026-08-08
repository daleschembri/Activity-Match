-- Ensure INSERT/UPDATE policies have explicit WITH CHECK (some clients require it)
DROP POLICY IF EXISTS user_interests_own ON user_interests;
CREATE POLICY user_interests_own ON user_interests
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_availability_own ON user_availability;
CREATE POLICY user_availability_own ON user_availability
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
