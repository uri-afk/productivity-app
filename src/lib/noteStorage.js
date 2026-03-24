import { supabase } from './supabase'

const BUCKET = 'note-attachments'

async function ensureBucket() {
  const { error: listError } = await supabase.storage.from(BUCKET).list('__probe__', { limit: 1 })
  if (!listError || listError.message !== 'Bucket not found') return

  // Bucket missing — try to create it as private
  const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: false })
  if (createError && !createError.message?.includes('already exists')) {
    const err = new Error(
      `Storage bucket "${BUCKET}" does not exist and could not be created automatically.\n\n` +
      `Please set it up in your Supabase project:\n` +
      `1. Go to Supabase Dashboard → Storage → New bucket\n` +
      `2. Name it "note-attachments", leave Public bucket OFF → Create\n` +
      `3. Then run the SQL in supabase/storage-setup.sql to add upload policies\n\n` +
      `Original error: ${createError.message}`
    )
    err.code = 'BUCKET_MISSING'
    throw err
  }
}

/**
 * Upload a file. Returns { path } — the stable storage path.
 * Callers use getSignedUrl(path) to get a display URL.
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
      hint = '\n\nFix: create a private bucket named "note-attachments" in Supabase Dashboard → Storage.'
    }
    const err = new Error(`Upload failed: ${msg}${hint}`)
    err.supabaseError = error
    throw err
  }

  return { path }
}

/**
 * Get a 1-hour signed URL for a stored file path.
 * Returns null on error (file missing or no permission).
 */
export async function getSignedUrl(path, expiresIn = 3600) {
  if (!path) return null
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)
  if (error) { console.warn('getSignedUrl failed:', error.message); return null }
  return data.signedUrl
}
