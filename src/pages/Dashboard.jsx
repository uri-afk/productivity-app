import { useOutletContext } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'

export default function Dashboard() {
  const { view } = useOutletContext()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <LayoutDashboard size={20} className="text-blue-600 dark:text-blue-400" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Your workspace overview</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Phase 2 complete — navigation shell is ready.
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Current view: <span className="font-medium">{view}</span>
        </p>
      </div>
    </div>
  )
}
