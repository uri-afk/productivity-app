import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'
import AuthPage from './pages/AuthPage'
import AppShell from './components/layout/AppShell'
import Dashboard from './pages/Dashboard'
import ProjectView from './pages/ProjectView'

function Spinner() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

/** Redirect to /login if not authenticated */
function ProtectedLayout() {
  const { loading, session } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Redirect to /dashboard if already authenticated */
function PublicLayout() {
  const { loading, session } = useAuth()
  if (loading) return <Spinner />
  if (session) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/login" element={<AuthPage />} />
            </Route>

            {/* Protected routes — all live inside the AppShell */}
            <Route element={<ProtectedLayout />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"     element={<Dashboard />} />
                <Route path="/project/:id"   element={<ProjectView />} />
                <Route path="/search"        element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
