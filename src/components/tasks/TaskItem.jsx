import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import TagBadge from '../ui/TagBadge'
import PriorityBadge from '../ui/PriorityBadge'
import { formatDueDate, dueDateStatus } from '../../lib/dates'

const dueDateClass = {
  overdue: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 rounded',
  today:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded',
  future:  'text-slate-400 dark:text-slate-500',
}

export default function TaskItem({ task, onToggle, onClick, onUpdate, activeTag, onTagClick }) {
  const done = task.status === 'done'
  const dateLabel = formatDueDate(task.due_date)
  const dateStatus = dueDateStatus(task.due_date)
  const subtasks = task.subtasks ?? []
  const [expanded, setExpanded] = useState(false)
  const [addingSubtask, setAddingSubtask] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const inputRef = useRef(null)
  const doneCount = subtasks.filter(s => s.done).length

  useEffect(() => {
    if (addingSubtask) inputRef.current?.focus()
  }, [addingSubtask])

  function toggleSubtask(id) {
    const updated = subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s)
    onUpdate?.(task.id, { subtasks: updated })
  }

  function addSubtask() {
    const title = newSubtask.trim()
    if (!title) { setAddingSubtask(false); return }
    onUpdate?.(task.id, { subtasks: [...subtasks, { id: crypto.randomUUID(), title, done: false }] })
    setNewSubtask('')
    inputRef.current?.focus()
  }

  return (
    <div className={cn('rounded-lg', done && 'opacity-60')}>
      {/* Main row */}
      <div
        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg"
        onClick={() => onClick(task)}
      >
        {/* Checkbox */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(task) }}
          className={cn(
            'mt-0.5 w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
            done
              ? 'bg-blue-600 border-blue-600'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
          )}
        >
          {done && (
            <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm text-slate-900 dark:text-white truncate', done && 'line-through text-slate-400 dark:text-slate-500')}>
            {task.title}
          </p>
          {(task.tags?.length > 0 || dateLabel) && (
            <div className="flex items-center flex-wrap gap-1.5 mt-1">
              {task.tags?.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  active={activeTag === tag}
                  onClick={e => { e?.stopPropagation?.(); onTagClick?.(tag) }}
                />
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
      </div>

      {/* Sub-row: expand toggle when subtasks exist; add button only when list is collapsed */}
      <div className="ml-10 flex items-center gap-3 px-2 pb-1">
        {(subtasks.length > 0 || expanded) && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <ChevronRight size={12} className={cn('transition-transform duration-150', expanded && 'rotate-90')} />
            <span>{subtasks.length > 0 ? `${doneCount}/${subtasks.length} subtasks` : 'Subtasks'}</span>
          </button>
        )}
        {!expanded && !addingSubtask && (
          <button
            onClick={() => { setExpanded(true); setAddingSubtask(true) }}
            className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Plus size={11} /> Add subtask
          </button>
        )}
      </div>

      {/* Subtask list + inline add */}
      {(expanded || addingSubtask) && (
        <div className="ml-10 mb-1.5 space-y-0.5">
          {subtasks.map(sub => (
            <div key={sub.id} className="flex items-center gap-2 px-2 py-1">
              <button
                onClick={() => toggleSubtask(sub.id)}
                className={cn(
                  'w-3.5 h-3.5 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
                  sub.done
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
                )}
              >
                {sub.done && (
                  <svg className="w-2 h-2 text-white" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
              <span className={cn(
                'text-xs',
                sub.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-300'
              )}>
                {sub.title}
              </span>
            </div>
          ))}

          {/* Add subtask row — at the bottom of the list */}
          {addingSubtask ? (
            <div className="flex items-center gap-2 px-2 py-1">
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
              className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Plus size={11} /> Add subtask
            </button>
          )}
        </div>
      )}
    </div>
  )
}
