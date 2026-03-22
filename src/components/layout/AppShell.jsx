import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopNav from './TopNav'
import BottomTabBar from './BottomTabBar'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [view, setView] = useState('list')

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0">
        <TopNav
          view={view}
          onViewChange={setView}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Scrollable content area — extra bottom padding on mobile for tab bar */}
        <main className="flex-1 overflow-y-auto p-6 pb-24 lg:pb-6">
          <Outlet context={{ view, setView }} />
        </main>
      </div>

      <BottomTabBar />
    </div>
  )
}
