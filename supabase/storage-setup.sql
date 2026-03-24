-- Run this once in Supabase Dashboard → SQL Editor.
-- Creates a PRIVATE bucket (no public CDN) and scopes all access to each user's own files.

-- 1. Create private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-attachments', 'note-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Upload: users can only write into their own folder  ({uid}/...)
CREATE POLICY "Users can upload own attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'note-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Read: users can only read their own files (signed URLs are generated server-side)
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
