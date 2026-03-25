import { supabase } from './supabase'

/** Validate an invite token without being signed in (uses RPC). */
export async function validateInviteToken(token) {
  const { data, error } = await supabase
    .rpc('validate_invite_token', { p_token: token })
  if (error || !data?.length) return { email: null, valid: false }
  const row = data[0]
  return { email: row.invite_email, valid: row.invite_valid }
}

/**
 * Accept an invite and create the user's profile atomically.
 * Call this right after sign-up or first OAuth login.
 */
export async function acceptInvite(token) {
  const { data, error } = await supabase
    .rpc('accept_invite', { p_token: token })
  return { success: data === true, error }
}

/**
 * Check whether the signed-in user already has an approved profile.
 * Returns { approved, disabled } or null on network error.
 */
export async function getMyProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('is_disabled')
    .single()
  if (error) return null          // no profile yet
  return { approved: true, disabled: data.is_disabled }
}

/**
 * Look up a valid (un-accepted, un-revoked, non-expired) invite for the
 * currently signed-in user's email.  Returns the token or null.
 */
export async function getMyPendingInvite() {
  const { data } = await supabase
    .from('invites')
    .select('token')
    .eq('revoked', false)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return data?.token ?? null
}

// ── Admin-only helpers ────────────────────────────────────────

export async function createInvite(email) {
  const { data, error } = await supabase
    .from('invites')
    .insert({ email: email.trim().toLowerCase() })
    .select()
    .single()
  return { data, error }
}

export async function revokeInvite(id) {
  const { error } = await supabase
    .from('invites')
    .update({ revoked: true })
    .eq('id', id)
  return { error }
}

export async function listInvites() {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data ?? [], error }
}

export async function listProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  return { data: data ?? [], error }
}

export async function setProfileDisabled(id, disabled) {
  const { error } = await supabase
    .from('profiles')
    .update({ is_disabled: disabled })
    .eq('id', id)
  return { error }
}
