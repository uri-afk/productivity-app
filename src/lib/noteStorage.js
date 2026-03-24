import { supabase } from './supabase'

const BUCKET = 'note-attachments'

/**
 * Attempt to create the storage bucket if it doesn't exist.
 * Silently succeeds if the bucket already exists.
 * Throws a structured error if creation fails.
 */
async function ensureBucket() {
  // Try to list a dummy path — if we get anything other than "Bucket not found"
  // the bucket already exists and is accessible.
  const { error: listError } = await supabase.storage.from(BUCKET).list('__probe__', { limit: 1 })
  if (!listError || listError.message !== 'Bucket not found') return // exists

  // Bucket doesn't exist — try to create it (requires appropriate Supabase permissions)
  const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: true })
  if (createError && !createError.message?.includes('already exists')) {
    const err = new Error(
      `Storage bucket "${BUCKET}" does not exist and could not be created automatically.\n\n` +
      `Please set it up in your Supabase project:\n` +
      `1. Go to Supabase Dashboard → Storage → New bucket\n` +
      `2. Name it "note-attachments" and enable "Public bucket"\n` +
      `3. Then run the SQL in supabase/storage-setup.sql to add upload policies\n\n` +
      `Original error: ${createError.message}`
    )
    err.code = 'BUCKET_MISSING'
    throw err
  }
}

/**
 * Upload a file to Supabase Storage under the user's folder.
 * Returns { url, path } on success. Throws a descriptive error on failure.
 */
export async function uploadNoteFile(file, userId, noteId) {
  await ensureBucket()

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${noteId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) {
    const msg = error.message ?? String(error)
    let hint = ''
    if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('Unauthorized') || msg.includes('403')) {
      hint = '\n\nFix: run the SQL in supabase/storage-setup.sql in your Supabase SQL Editor to add upload policies.'
    } else if (msg.includes('Bucket not found')) {
      hint = '\n\nFix: create a public bucket named "note-attachments" in Supabase Dashboard → Storage.'
    }
    const err = new Error(`Upload failed: ${msg}${hint}`)
    err.supabaseError = error
    throw err
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return { url: publicUrl, path }
}
