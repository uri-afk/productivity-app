import { useState } from 'react'
import { signIn, signInWithGoogle } from '../lib/auth'
import { useAuth } from '../lib/AuthContext'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.092 17.64 11.784 17.64 9.2z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  )
}

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { accessError, clearAccessError } = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    clearAccessError()
    setError('')
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
  }

  async function handleGoogle() {
    clearAccessError()
    setError('')
    setGoogleLoading(true)
    const { error } = await signInWithGoogle()
    // Google OAuth redirects away; we only land here if there's an error
    if (error) {
      setGoogleLoading(false)
      setError(error.message)
    }
  }

  const shownError = error
    || (accessError === 'not_invited' ? 'This app is invite-only. Please contact the admin for an invite link.' : '')
    || (accessError === 'disabled' ? 'Your account has been disabled. Please contact the admin.' : '')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Taskflow</h1>
          <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">Sign in to your workspace</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Welcome back</h2>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-[#131314] hover:bg-[#2a2a2b] disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition cursor-pointer mb-4"
          >
            <GoogleIcon />
            {googleLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div className="relative mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-slate-600" />
            </div>
            <div className="relative flex justify-center">
              <span className="text-xs text-gray-400 bg-white dark:bg-slate-800 px-2">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            {shownError && (
              <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {shownError}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition cursor-pointer"
            >
              {loading ? 'Please wait…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-slate-500 mt-6">
            Access is by invitation only.
          </p>
        </div>
      </div>
    </div>
  )
}
