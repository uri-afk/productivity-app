import { useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { FolderOpen, CheckSquare, FileText, ArrowRight } from 'lucide-react'
import { useProjectsContext } from '../lib/ProjectsContext'
import NewProjectModal from '../components/projects/NewProjectModal'
import { useState } from 'react'

export default function Dashboard() {
  const { registerNewHandler } = useOutletContext()
  const { projects, createProject } = useProjectsContext()
  const [showNew, setShowNew] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    registerNewHandler(() => setShowNew(true))
  }, [registerNewHandler])

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">Your projects</h2>
        <button
          onClick={() => setShowNew(true)}
          className="text-xs text-blue-600 hover:underline font-medium"
        >
          + New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center">
          <FolderOpen className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={32} strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">No projects yet</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Create your first project to get started</p>
          <button
            onClick={() => setShowNew(true)}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Create project
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => navigate(`/project/${p.id}`)}
              className="w-full flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 rounded-xl px-4 py-3.5 text-left transition-colors group"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-sm font-bold"
                style={{ backgroundColor: p.color ?? '#6366f1' }}
              >
                {p.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{p.name}</p>
                {p.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{p.description}</p>
                )}
              </div>
              <ArrowRight size={15} className="text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors shrink-0" />
            </button>
          ))}
        </div>
      )}

      <NewProjectModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={async (fields) => {
          const { data, error } = await createProject(fields)
          if (!error && data) navigate(`/project/${data.id}`)
          return { error }
        }}
      />
    </div>
  )
}
