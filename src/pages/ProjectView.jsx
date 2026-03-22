import { useParams } from 'react-router-dom'
import { useOutletContext } from 'react-router-dom'
import { FolderOpen } from 'lucide-react'
import { PROJECTS } from '../lib/mock'

export default function ProjectView() {
  const { id } = useParams()
  const { view } = useOutletContext()
  const project = PROJECTS.find(p => p.id === id)

  if (!project) {
    return (
      <div className="max-w-2xl">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">Project not found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: project.color + '20' }}
        >
          <FolderOpen size={20} style={{ color: project.color }} strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">{project.name}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {project.taskCount} tasks
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Project content coming in Phase 3.
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Current view: <span className="font-medium">{view}</span>
        </p>
      </div>
    </div>
  )
}
