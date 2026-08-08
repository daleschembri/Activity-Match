-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE reliability_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_read ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY categories_read ON categories FOR SELECT USING (is_active = true);
CREATE POLICY tags_read ON tags FOR SELECT USING (true);

CREATE POLICY activities_read_published ON activities FOR SELECT USING (
  status IN ('published', 'completed', 'cancelled', 'expired') OR host_user_id = auth.uid()
);
CREATE POLICY activities_insert_own ON activities FOR INSERT WITH CHECK (host_user_id = auth.uid());
CREATE POLICY activities_update_own ON activities FOR UPDATE USING (host_user_id = auth.uid());

CREATE POLICY join_requests_read ON join_requests FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.host_user_id = auth.uid())
);
CREATE POLICY join_requests_insert ON join_requests FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY participations_read ON participations FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM activities a WHERE a.id = activity_id AND a.host_user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM participations p2 WHERE p2.activity_id = participations.activity_id AND p2.user_id = auth.uid() AND p2.status = 'confirmed')
);

CREATE POLICY messages_read ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations c
    JOIN participations p ON p.activity_id = c.activity_id
    WHERE c.id = conversation_id AND p.user_id = auth.uid() AND p.status = 'confirmed'
  ) OR EXISTS (
    SELECT 1 FROM conversations c
    JOIN activities a ON a.id = c.activity_id
    WHERE c.id = conversation_id AND a.host_user_id = auth.uid()
  )
);

CREATE POLICY messages_insert ON messages FOR INSERT WITH CHECK (
  sender_user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM conversations c
    JOIN participations p ON p.activity_id = c.activity_id
    WHERE c.id = conversation_id AND p.user_id = auth.uid() AND p.status = 'confirmed'
  )
);

CREATE POLICY user_interests_own ON user_interests FOR ALL USING (user_id = auth.uid());
CREATE POLICY user_availability_own ON user_availability FOR ALL USING (user_id = auth.uid());
CREATE POLICY swipe_events_own ON swipe_events FOR ALL USING (user_id = auth.uid());
CREATE POLICY saved_activities_own ON saved_activities FOR ALL USING (user_id = auth.uid());
CREATE POLICY reliability_read ON reliability_records FOR SELECT USING (true);
CREATE POLICY reliability_insert_own ON reliability_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY activity_feedback_own ON activity_feedback FOR ALL USING (user_id = auth.uid());

CREATE POLICY groups_read ON activity_groups FOR SELECT USING (true);
CREATE POLICY group_memberships_read ON group_memberships FOR SELECT USING (true);
