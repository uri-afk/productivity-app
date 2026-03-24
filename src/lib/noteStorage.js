import { supabase } from './supabase'

const BUCKET = 'note-attachments'

/**
 * Upload a file to Supabase Storage under the user's folder.
 * Returns { url, path } on success.
 * Throws on error.
 */
export async function uploadNoteFile(file, userId, noteId) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${userId}/${noteId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return { url: publicUrl, path }
}
