import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { requestNotificationPermission } from './notifications'
import { getMyProfile, getMyPendingInvite, acceptInvite } from './invites'
import { signOut } from './auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [accessError, setAccessError] = useState(null) // null | 'not_invited' | 'disabled'

  useEffect(() => {
    let mounted = true

    async function checkAndSetSession(sess, isNewLogin) {
      if (!sess) {
        if (mounted) setSession(null)
        return
      }

      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
      if (sess.user.email === adminEmail) {
        if (mounted) { setSession(sess); setAccessError(null) }
        return
      }

      const profile = await getMyProfile()

      if (profile) {
        if (profile.disabled) {
          await signOut()
          if (mounted) { setAccessError('disabled'); setSession(null) }
          return
        }
        if (mounted) { setSession(sess); setAccessError(null) }
        return
      }

      // No profile — try to accept a pending invite
      if (isNewLogin) {
        let token = localStorage.getItem('pendingInviteToken')
        if (!token) token = await getMyPendingInvite()
        if (token) {
          const { success } = await acceptInvite(token)
          if (success) {
            localStorage.removeItem('pendingInviteToken')
            if (mounted) { setSession(sess); setAccessError(null) }
            return
          }
        }
        // No valid invite
        await signOut()
        if (mounted) { setAccessError('not_invited'); setSession(null) }
      } else {
        // Existing session but no profile (shouldn't normally happen)
        await signOut()
        if (mounted) { setAccessError('not_invited'); setSession(null) }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (event === 'INITIAL_SESSION') {
        await checkAndSetSession(sess, false)
      } else if (event === 'SIGNED_IN') {
        await checkAndSetSession(sess, true)
        if (mounted && sess) requestNotificationPermission()
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setSession(null)
        // Don't clear accessError — it was set before signOut was called
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (mounted && sess) setSession(sess)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading: session === undefined,
      accessError,
      clearAccessError: () => setAccessError(null),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
