-- Run this in the Supabase SQL editor (or Dashboard → Storage → New bucket manually).
-- Creates the note-attachments bucket and scopes access to each user's own folder.

-- 1. Create public bucket (files are served via public CDN URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Upload: users can only upload into their own folder (first path segment = uid)
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Read: users can only read their own files via the API (public URLs bypass this)
CREATE POLICY "Users can read own attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. Delete: users can only delete their own files
CREATE POLICY "Users can delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
