import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { requestNotificationPermission } from './notifications'
import { getMyProfile, getMyPendingInvite, acceptInvite } from './invites'
import { signOut } from './auth'

const AuthContext = createContext(null)

function isGenuineNewLogin(sess) {
  if (!sess?.user?.last_sign_in_at) return false
  return Date.now() - new Date(sess.user.last_sign_in_at).getTime() < 60_000
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [accessError, setAccessError] = useState(null) // null | 'not_invited' | 'disabled'

  useEffect(() => {
    let mounted = true

    // Fallback in case INITIAL_SESSION fires late or not at all
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      if (mounted) setSession(prev => prev === undefined ? sess : prev)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (event === 'INITIAL_SESSION') {
        if (mounted) setSession(sess)

      } else if (event === 'SIGNED_IN') {
        if (mounted) { setSession(sess); setAccessError(null) }

        // Only run invite/profile check for brand-new logins, not session restorations
        if (!sess || !isGenuineNewLogin(sess)) return

        const adminEmail = import.meta.env.VITE_ADMIN_EMAIL
        if (sess.user.email === adminEmail) {
          if (mounted) requestNotificationPermission()
          return
        }

        const profile = await getMyProfile()
        if (profile) {
          if (profile.disabled) {
            await signOut()
            if (mounted) { setAccessError('disabled'); setSession(null) }
            return
          }
        } else {
          // New user — accept pending invite
          let token = localStorage.getItem('pendingInviteToken')
          if (!token) token = await getMyPendingInvite()
          if (token) {
            const { success } = await acceptInvite(token)
            if (success) {
              localStorage.removeItem('pendingInviteToken')
            } else {
              await signOut()
              if (mounted) { setAccessError('not_invited'); setSession(null) }
              return
            }
          } else {
            await signOut()
            if (mounted) { setAccessError('not_invited'); setSession(null) }
            return
          }
        }
        if (mounted) requestNotificationPermission()

      } else if (event === 'SIGNED_OUT') {
        if (mounted) setSession(null)

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
