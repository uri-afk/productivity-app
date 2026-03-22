import { signOut } from '../lib/auth'
import { useAuth } from '../lib/AuthContext'

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Productivity</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{user?.email}</span>
          <button
            onClick={() => signOut()}
            className="text-sm text-gray-600 hover:text-gray-900 transition cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">You're in!</h2>
        <p className="text-gray-500">Foundation is ready. Feature UI coming in Phase 2.</p>
      </main>
    </div>
  )
}
