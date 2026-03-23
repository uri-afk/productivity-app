import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
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
  const doneCount = subtasks.filter(s => s.done).length

  function toggleSubtask(id) {
    const updated = subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s)
    onUpdate?.(task.id, { subtasks: updated })
  }

  return (
    <div className={cn('rounded-lg transition-colors', done && 'opacity-60')}>
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

        {/* Subtask expand toggle */}
        {subtasks.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
            className="flex items-center gap-0.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-1 shrink-0"
          >
            <ChevronRight
              size={13}
              className={cn('transition-transform duration-150', expanded && 'rotate-90')}
            />
            <span>{doneCount}/{subtasks.length}</span>
          </button>
        )}
      </div>

      {/* Subtask list */}
      {expanded && subtasks.length > 0 && (
        <div className="ml-10 mb-1 space-y-0.5">
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
        </div>
      )}
    </div>
  )
}
