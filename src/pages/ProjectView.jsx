import { useEffect, useState } from 'react'
import { useParams, useOutletContext, useNavigate } from 'react-router-dom'
import { CheckSquare, FileText, Tag, Table2, Plus } from 'lucide-react'
import { useResizable } from '../hooks/useResizable'
import { useTasks } from '../hooks/useTasks'
import { useNotes } from '../hooks/useNotes'
import { useProjectsContext } from '../lib/ProjectsContext'
import TaskList from '../components/tasks/TaskList'
import TaskBoard from '../components/tasks/TaskBoard'
import TaskSidePanel from '../components/tasks/TaskSidePanel'
import TableNoteEditor from '../components/notes/TableNoteEditor'
import InlineTableNote from '../components/table/InlineTableNote'
import TaskNoteEditorPanel from '../components/tasks/TaskNoteEditorPanel'
import NoteList from '../components/notes/NoteList'
import NoteEditor from '../components/notes/NoteEditor'
import TagBadge from '../components/ui/TagBadge'
import { cn } from '../lib/cn'

const TABS = [
  { id: 'tasks', label: 'Tasks', Icon: CheckSquare },
  { id: 'notes', label: 'Notes', Icon: FileText    },
]

export default function ProjectView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { view, activeTab, setActiveTab, registerNewHandler } = useOutletContext()
  const { projects } = useProjectsContext()
  const project = projects.find(p => p.id === id)

  const { tasks, loading: tasksLoading, createTask, updateTask, deleteTask } = useTasks(id)
  const { notes, loading: notesLoading, createNote, updateNote, deleteNote } = useNotes(id)

  const [selectedTask, setSelectedTask] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [activeTag, setActiveTag] = useState(null)
  const [taskNotePanel, setTaskNotePanel] = useState(null) // { taskId, note }

  // Register +New handler based on current tab
  useEffect(() => {
    if (activeTab === 'tasks') {
      // TaskList has its own inline add; we'll open it via a custom event
      registerNewHandler(() => {
        document.dispatchEvent(new CustomEvent('open-add-task'))
      })
    } else {
      registerNewHandler(() => {
        document.dispatchEvent(new CustomEvent('open-add-note'))
      })
    }
  }, [activeTab, registerNewHandler])

  // Keep selected task in sync with live data
  useEffect(() => {
    if (selectedTask) {
      const fresh = tasks.find(t => t.id === selectedTask.id)
      if (fresh) setSelectedTask(fresh)
    }
  }, [tasks]) // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if project was deleted
  useEffect(() => {
    if (!project && projects.length > 0) navigate('/dashboard')
  }, [project, projects.length, navigate])

  // Collect all unique tags across tasks + notes
  const allTags = [...new Set([
    ...tasks.flatMap(t => t.tags ?? []),
    ...notes.flatMap(n => n.tags ?? []),
  ])]

  async function handleToggleTask(task) {
    await updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
  }

  function handleTagClick(tag) {
    setActiveTag(prev => prev === tag ? null : tag)
  }

  function handleNoteClick(task, note) {
    setTaskNotePanel({ taskId: task.id, note })
  }

  function handleAddNote(task) {
    const newNote = { id: crypto.randomUUID(), title: '', content: '' }
    updateTask(task.id, { task_notes: [...(task.task_notes ?? []), newNote] })
    setTaskNotePanel({ taskId: task.id, note: newNote })
  }

  function handleSaveTaskNote(updatedNote) {
    if (!taskNotePanel) return
    const task = tasks.find(t => t.id === taskNotePanel.taskId)
    if (!task) return
    const updated = (task.task_notes ?? []).map(n => n.id === updatedNote.id ? updatedNote : n)
    updateTask(taskNotePanel.taskId, { task_notes: updated })
  }

  const { width: contentWidth, startResize } = useResizable({
    defaultWidth: 896, minWidth: 400, maxWidth: 1400, flip: true,
  })

  if (!project) return null

  return (
    <div className="relative" style={{ width: contentWidth, maxWidth: '100%' }}>
      {/* Right-edge drag handle to resize content width */}
      <div
        onMouseDown={startResize}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10"
      />
      {/* Project header */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-white text-sm font-bold"
          style={{ backgroundColor: project.color ?? '#6366f1' }}
        >
          {project.name[0]}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-900 dark:text-white truncate">{project.name}</h2>
          {project.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{project.description}</p>
          )}
        </div>
      </div>

      {/* Tags filter bar */}
      {allTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Tag size={12} className="text-slate-400 shrink-0" />
          {allTags.map(tag => (
            <TagBadge
              key={tag}
              tag={tag}
              active={activeTag === tag}
              onClick={() => handleTagClick(tag)}
            />
          ))}
          {activeTag && (
            <button onClick={() => setActiveTag(null)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline">
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5 border-b border-slate-200 dark:border-slate-800">
        {TABS.map(({ id: tabId, label, Icon }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tabId
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <Icon size={14} strokeWidth={1.75} />
            {label}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <>
          {tasksLoading ? (
            <LoadingRows />
          ) : view === 'board' ? (
            <TaskBoard
              tasks={tasks}
              onUpdateTask={updateTask}
              onCreateTask={createTask}
              onSelectTask={setSelectedTask}
              activeTag={activeTag}
              onTagClick={handleTagClick}
            />
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl py-1">
              <TaskList
                tasks={tasks}
                onToggle={handleToggleTask}
                onSelect={setSelectedTask}
                onUpdate={updateTask}
                onDelete={deleteTask}
                onNoteClick={handleNoteClick}
                onAddNote={handleAddNote}
                onCreate={createTask}
                activeTag={activeTag}
                onTagClick={handleTagClick}
              />
            </div>
          )}
          {!tasksLoading && (
            <TaskTableSection
              tables={notes.filter(n => n.type === 'task_table')}
              onCreate={createNote}
              onUpdate={updateNote}
              onDelete={deleteNote}
            />
          )}
        </>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        notesLoading ? <LoadingRows /> : (
          <NoteList
            notes={notes}
            onSelect={setSelectedNote}
            onCreate={createNote}
            onDelete={deleteNote}
          />
        )
      )}

      {/* Task side panel */}
      {selectedTask && (
        <TaskSidePanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
        />
      )}

      {/* Note editor — text or table */}
      {selectedNote && selectedNote.type === 'table' ? (
        <TableNoteEditor
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onUpdate={updateNote}
        />
      ) : selectedNote ? (
        <NoteEditor
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onUpdate={updateNote}
        />
      ) : null}

      {/* Task note panel — opened from task list */}
      {taskNotePanel && (
        <TaskNoteEditorPanel
          note={taskNotePanel.note}
          onBack={() => setTaskNotePanel(null)}
          onSave={handleSaveTaskNote}
        />
      )}
    </div>
  )
}

function TaskTableSection({ tables, onCreate, onUpdate, onDelete }) {
  async function handleCreate() {
    await onCreate({
      title: 'New Table',
      type: 'task_table',
      content: JSON.stringify({
        columns: [
          { id: 'c0', name: 'Name',     type: 'text',   options: [] },
          { id: 'c1', name: 'Status',   type: 'select', options: ['To Do', 'In Progress', 'Done'] },
          { id: 'c2', name: 'Due Date', type: 'date',   options: [] },
        ],
        rows: [{ id: 'r0', cells: { c0: '', c1: '', c2: '' } }],
      }),
    })
  }

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Table2 size={13} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tables</span>
      </div>
      <div className="space-y-2">
        {tables.map(t => (
          <InlineTableNote key={t.id} note={t} onUpdate={onUpdate} onDelete={onDelete} />
        ))}
      </div>
      <button
        onClick={handleCreate}
        className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
      >
        <Plus size={14} /> Add table
      </button>
    </div>
  )
}

function LoadingRows() {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 rounded bg-slate-200 dark:bg-slate-700 flex-1" style={{ width: `${60 + i * 10}%` }} />
        </div>
      ))}
    </div>
  )
}
