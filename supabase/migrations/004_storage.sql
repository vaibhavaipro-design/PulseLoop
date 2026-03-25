-- 004_storage.sql
-- Storage: lock reports bucket to private + owner-only access
-- Run after creating the 'reports' bucket in Supabase dashboard (set as PRIVATE)
CREATE POLICY "storage_own_files" ON storage.objects
FOR ALL USING (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
) WITH CHECK (
  bucket_id = 'reports'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
