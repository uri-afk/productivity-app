import { useRef, useState, useCallback, useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import BottomTabBar from './BottomTabBar'
import GlobalSearch from '../search/GlobalSearch'
import QuickCapture from '../capture/QuickCapture'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('tasks')
  const [searchOpen, setSearchOpen] = useState(false)
  const [captureOpen, setCaptureOpen] = useState(false)
  const newHandlerRef = useRef(null)
  const navigate = useNavigate()

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

  function handleNavigateProject(projectId, tab) {
    if (tab) setActiveTab(tab)
    setSidebarOpen(false)
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0">
        <TopNav
          onMenuClick={() => setSidebarOpen(true)}
          onNew={() => newHandlerRef.current?.()}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">
          <Outlet context={{ activeTab, setActiveTab, registerNewHandler }} />
        </main>
      </div>

      <BottomTabBar onCapture={() => setCaptureOpen(true)} />

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
