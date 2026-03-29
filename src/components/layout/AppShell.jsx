import { useRef, useState, useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { WifiOff } from 'lucide-react'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import BottomTabBar from './BottomTabBar'
import GlobalSearch from '../search/GlobalSearch'
import QuickCapture from '../capture/QuickCapture'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks')
  const [searchOpen, setSearchOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const newHandlerRef = useRef(null)
  const navigate = useNavigate()
  const online = useOnlineStatus()

  const registerNewHandler = useCallback((fn) => { newHandlerRef.current = fn }, [])

  // Cmd+K → open quick capture
  useEffect(() => {
    function handler(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCaptureOpen(true)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Navigate to a task from a notification click
  function handleNotificationNavigate(projectId, taskId) {
    navigate(`/project/${projectId}`, { state: { highlightTaskId: taskId, tab: 'tasks' } })
  }

  function handleNavigateProject(projectId, tab) {
    if (tab) setActiveTab(tab)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-dvh bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <TopNav
          onMenuClick={() => setSidebarOpen(true)}
          onNew={() => setCaptureOpen(true)}
        />

        {/* Offline banner */}
        {!online && (
          <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 shrink-0">
            <WifiOff size={13} />
            You're offline — changes will sync when reconnected
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-safe-bottom">
          <Outlet context={{ activeTab, setActiveTab, registerNewHandler, onNotificationNavigate: handleNotificationNavigate }} />
        </main>
      </div>

      <BottomTabBar onCapture={() => setCaptureOpen(true)} onProjects={() => setSidebarOpen(true)} />

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigateProject={handleNavigateProject}
      />

      <QuickCapture
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
      />
    </div>
  )
}
