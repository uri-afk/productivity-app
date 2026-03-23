import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Plus, FileText, Trash2, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import TagBadge from '../ui/TagBadge'
import PriorityBadge from '../ui/PriorityBadge'
import { formatDueDate, dueDateStatus } from '../../lib/dates'

const dueDateClass = {
  overdue: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 rounded',
  today:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded',
  future:  'text-slate-400 dark:text-slate-500',
}

export default function TaskItem({ task, onToggle, onClick, onUpdate, onDelete, onNoteClick, onAddNote, activeTag, onTagClick }) {
  const done = task.status === 'done'
  const dateLabel = formatDueDate(task.due_date)
  const dateStatus = dueDateStatus(task.due_date)
  const subtasks = task.subtasks ?? []
  const taskNotes = task.task_notes ?? []
  const doneCount = subtasks.filter(s => s.done).length

  const [subtasksExpanded, setSubtasksExpanded] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (addingSubtask) inputRef.current?.focus()
  }, [addingSubtask])

  function toggleSubtask(id) {
    onUpdate?.(task.id, { subtasks: subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s) })
  }

  function deleteSubtask(id) {
    onUpdate?.(task.id, { subtasks: subtasks.filter(s => s.id !== id) })
  }

  function addSubtask() {
    const title = newSubtask.trim()
    if (!title) { setAddingSubtask(false); return }
    onUpdate?.(task.id, { subtasks: [...subtasks, { id: crypto.randomUUID(), title, done: false }] })
    setNewSubtask('')
    inputRef.current?.focus()
  }

  function deleteTaskNote(noteId) {
    onUpdate?.(task.id, { task_notes: taskNotes.filter(n => n.id !== noteId) })
  }

  return (
    <div className={cn('rounded-lg', done && 'opacity-60')}>

      {/* ── Main row ── */}
      <div
        className="group/row flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg"
        onClick={() => onClick(task)}
      >
        <button
          onClick={e => { e.stopPropagation(); onToggle(task) }}
          className={cn(
            'mt-0.5 w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
            done ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
          )}
        >
          {done && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p className={cn('text-sm text-slate-900 dark:text-white truncate', done && 'line-through text-slate-400 dark:text-slate-500')}>
            {task.title}
          </p>
          {(task.tags?.length > 0 || dateLabel) && (
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              {task.tags?.map(tag => (
                <TagBadge key={tag} tag={tag} active={activeTag === tag}
                  onClick={e => { e?.stopPropagation?.(); onTagClick?.(tag) }} />
              ))}
              {dateLabel && (
                <span className={cn('text-xs font-medium', dueDateClass[dateStatus] ?? dueDateClass.future)}>
                  {dateLabel}
                </span>
              )}
            </div>
          )}
        </div>

        <PriorityBadge priority={task.priority} />

        <button
          onClick={e => { e.stopPropagation(); onDelete?.(task.id) }}
          className="opacity-0 group-hover/row:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0"
          title="Delete task"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Subtasks section ── */}
      <div className="ml-10 px-2 pb-0.5">
        {subtasks.length === 0 && !subtasksExpanded ? (
          <button
            onClick={() => { setSubtasksExpanded(true); setAddingSubtask(true) }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-0.5 transition-colors"
          >
            <Plus size={11} /> Add subtask
          </button>
        ) : (
          <button
            onClick={() => setSubtasksExpanded(v => !v)}
            className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-0.5 transition-colors"
          >
            <ChevronRight size={12} className={cn('transition-transform duration-150', subtasksExpanded && 'rotate-90')} />
            {doneCount}/{subtasks.length} subtasks
          </button>
        )}
      </div>

      {(subtasksExpanded || addingSubtask) && (
        <div className="ml-10 mb-1 space-y-0.5">
          {subtasks.map(sub => (
            <div key={sub.id} className="group/item flex items-center gap-2 px-2 py-0.5">
              <button
                onClick={() => toggleSubtask(sub.id)}
                className={cn(
                  'w-3.5 h-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
                  sub.done ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                )}
              >
                {sub.done && (
                  <svg className="w-2 h-2 text-white" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={cn('flex-1 text-xs', sub.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300')}>
                {sub.title}
              </span>
              <button
                onClick={() => deleteSubtask(sub.id)}
                className="opacity-0 group-hover/item:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
              >
                <X size={11} />
              </button>
            </div>
          ))}

          {addingSubtask ? (
            <div className="flex items-center gap-2 px-2 py-0.5">
              <div className="w-3.5 h-3.5 shrink-0 rounded border-2 border-dashed border-slate-300 dark:border-slate-600" />
              <input
                ref={inputRef}
                value={newSubtask}
                onChange={e => setNewSubtask(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); addSubtask() }
                  if (e.key === 'Escape') { setAddingSubtask(false); setNewSubtask('') }
                }}
                onBlur={() => { addSubtask(); setAddingSubtask(false) }}
                placeholder="Subtask title…"
                className="flex-1 text-xs bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
              />
            </div>
          ) : (
            <button
              onClick={() => setAddingSubtask(true)}
              className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Plus size={11} /> Add subtask
            </button>
          )}
        </div>
      )}

      {/* ── Notes section ── */}
      <div className="ml-10 px-2 pb-1">
        {taskNotes.length === 0 ? (
          <button
            onClick={() => onAddNote?.(task)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-0.5 transition-colors"
          >
            <Plus size={11} /> Add note
          </button>
        ) : (
          <button
            onClick={() => setNotesExpanded(v => !v)}
            className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-0.5 transition-colors"
          >
            <ChevronRight size={12} className={cn('transition-transform duration-150', notesExpanded && 'rotate-90')} />
            <FileText size={11} className="mx-0.5" />
            {taskNotes.length} {taskNotes.length === 1 ? 'note' : 'notes'}
          </button>
        )}
      </div>

      {notesExpanded && taskNotes.length > 0 && (
        <div className="ml-10 mb-2 space-y-0.5">
          {taskNotes.map(note => (
            <div key={note.id} className="group/item flex items-center gap-2 px-2 py-0.5">
              <FileText size={11} className="text-slate-400 shrink-0" />
              <button
                onClick={() => onNoteClick?.(task, note)}
                className="flex-1 text-xs text-left text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 truncate transition-colors"
              >
                {note.title || <span className="italic text-slate-400">Untitled</span>}
              </button>
              <button
                onClick={() => deleteTaskNote(note.id)}
                className="opacity-0 group-hover/item:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
