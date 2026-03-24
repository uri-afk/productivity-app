import { useEffect, useState, useRef } from 'react'
import { useParams, useOutletContext, useNavigate, useLocation } from 'react-router-dom'
import { useResizable } from '../hooks/useResizable'
import { useTasks } from '../hooks/useTasks'
import { useNotes } from '../hooks/useNotes'
import { useProjectsContext } from '../lib/ProjectsContext'
import TaskTableView from '../components/tasks/TaskTableView'
import NoteListView from '../components/notes/NoteListView'
import { cn } from '../lib/cn'

const TABS = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'notes', label: 'Notes' },
]

export default function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { activeTab, setActiveTab, registerNewHandler } = useOutletContext()
  const { projects, updateProject } = useProjectsContext()
  const project = projects.find(p => p.id === id)
  const navStateHandled = useRef(false)

  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks(id)
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useNotes(id)

  const { width: contentWidth, startResize } = useResizable({
    defaultWidth: 960, minWidth: 480, maxWidth: 1600, flip: true,
  })

  // Register +New handler based on active tab
  useEffect(() => {
    if (activeTab === 'tasks') {
      registerNewHandler(() => document.dispatchEvent(new CustomEvent('open-add-task')))
    } else {
      registerNewHandler(() => document.dispatchEvent(new CustomEvent('open-add-note')))
    }
  }, [activeTab, registerNewHandler])

  // Redirect if project deleted
  useEffect(() => {
    if (!project && projects.length > 0) navigate('/dashboard')
  }, [project, projects.length, navigate])

  // Apply navigation state from dashboard / search (switch tab, highlight task or open note)
  useEffect(() => {
    if (navStateHandled.current) return
    const state = location.state
    if (!state) return
    navStateHandled.current = true
    if (state.tab) setActiveTab(state.tab)
    // Clear state so back-navigation doesn't re-apply it
    window.history.replaceState({}, '')
  }, [location.state, setActiveTab])

  if (!project) return null

  return (
    <div className="relative" style={{ width: contentWidth, maxWidth: '100%' }}>
      {/* Right-edge resize handle */}
      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10"
      />

      {/* Project header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
          style={{ backgroundColor: project.color ?? '#6366f1' }}>
          {project.name[0]}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{project.name}</h2>
          {project.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.description}</p>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ id: tabId, label }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tabId
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}>
            {label}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        tasksLoading ? <LoadingRows /> : (
          <TaskTableView
            tasks={tasks}
            project={project}
            onCreateTask={createTask}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onUpdateProject={updateProject}
            highlightTaskId={location.state?.highlightTaskId}
          />
        )
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        notesLoading ? <LoadingRows /> : (
          <NoteListView
            notes={notes}
            project={project}
            onCreateNote={createNote}
            onUpdateNote={updateNote}
            onDeleteNote={deleteNote}
            onUpdateProject={updateProject}
            initialOpenNoteId={location.state?.openNoteId}
          />
        )
      )}
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${50 + i * 8}%` }} />
        </div>
      ))}
    </div>
  )
}
