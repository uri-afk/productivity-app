import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import {
  createInvite, listInvites, revokeInvite,
  listProfiles, setProfileDisabled,
} from '../lib/invites'

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function inviteStatus(inv) {
  if (inv.revoked) return { label: 'Revoked', cls: 'text-red-500' }
  if (inv.accepted_at) return { label: 'Accepted', cls: 'text-green-600' }
  if (new Date(inv.expires_at) < new Date()) return { label: 'Expired', cls: 'text-gray-400' }
  return { label: 'Pending', cls: 'text-blue-600' }
}

export default function AdminPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [invites, setInvites] = useState([])
  const [profiles, setProfiles] = useState([])
  const [newEmail, setNewEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [sendMessage, setSendMessage] = useState('')

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) {
      navigate('/dashboard', { replace: true })
      return
    }
    reload()
  }, [user])

  async function reload() {
    const [inv, prof] = await Promise.all([listInvites(), listProfiles()])
    setInvites(inv.data)
    setProfiles(prof.data)
  }

  async function handleCreateInvite(e) {
    e.preventDefault()
    setSendError('')
    setSendMessage('')
    setSending(true)
    const { data, error } = await createInvite(newEmail)
    setSending(false)
    if (error) {
      setSendError(error.message)
    } else {
      setSendMessage(`Invite created for ${data.email}. Share this link: ${window.location.origin}/invite/${data.token}`)
      setNewEmail('')
      reload()
    }
  }

  async function handleRevoke(id) {
    await revokeInvite(id)
    reload()
  }

  async function handleToggleDisabled(id, current) {
    await setProfileDisabled(id, !current)
    reload()
  }

  if (!user || user.email !== ADMIN_EMAIL) return null

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Invite management and user access</p>
      </div>

      {/* Create invite */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6">
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Send an invite</h2>
        <form onSubmit={handleCreateInvite} className="flex gap-3">
          <input
            type="email"
            required
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="person@example.com"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition cursor-pointer"
          >
            {sending ? 'Creating…' : 'Create invite'}
          </button>
        </form>
        {sendError && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {sendError}
          </p>
        )}
        {sendMessage && (
          <div className="mt-3 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2 break-all">
            {sendMessage}
          </div>
        )}
      </section>

      {/* Invite list */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Invites</h2>
        {invites.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">No invites yet.</p>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
            {invites.map(inv => {
              const { label, cls } = inviteStatus(inv)
              const canRevoke = !inv.revoked && !inv.accepted_at && new Date(inv.expires_at) > new Date()
              return (
                <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{inv.email}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      Created {formatDate(inv.created_at)} · Expires {formatDate(inv.expires_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium ${cls}`}>{label}</span>
                    {canRevoke && (
                      <button
                        onClick={() => handleRevoke(inv.id)}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* User list */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">Users</h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">No approved users yet.</p>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 overflow-hidden">
            {profiles.map(p => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.email}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">Joined {formatDate(p.created_at)}</p>
                </div>
                <button
                  onClick={() => handleToggleDisabled(p.id, p.is_disabled)}
                  className={`text-xs font-medium cursor-pointer ${
                    p.is_disabled
                      ? 'text-green-600 hover:text-green-800'
                      : 'text-red-500 hover:text-red-700'
                  }`}
                >
                  {p.is_disabled ? 'Enable' : 'Disable'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
