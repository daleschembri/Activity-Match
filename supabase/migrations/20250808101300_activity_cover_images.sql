-- Activity cover images

ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS cover_image_ref TEXT;

INSERT INTO storage.buckets (id, name, public)
VALUES ('activity-covers', 'activity-covers', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS activity_covers_public_read ON storage.objects;
CREATE POLICY activity_covers_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'activity-covers');

DROP POLICY IF EXISTS activity_covers_insert_own ON storage.objects;
CREATE POLICY activity_covers_insert_own ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'activity-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS activity_covers_update_own ON storage.objects;
CREATE POLICY activity_covers_update_own ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'activity-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'activity-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS activity_covers_delete_own ON storage.objects;
CREATE POLICY activity_covers_delete_own ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'activity-covers'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
