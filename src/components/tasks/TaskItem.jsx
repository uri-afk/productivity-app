import { cn } from '../../lib/cn'
import TagBadge from '../ui/TagBadge'
import PriorityBadge from '../ui/PriorityBadge'
import { formatDueDate, dueDateStatus } from '../../lib/dates'

const dueDateClass = {
  overdue: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 rounded',
  today:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded',
  future:  'text-slate-400 dark:text-slate-500',
}

export default function TaskItem({ task, onToggle, onClick, activeTag, onTagClick }) {
  const done = task.status === 'done'
  const dateLabel = formatDueDate(task.due_date)
  const dateStatus = dueDateStatus(task.due_date)

  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-slate-50 dark:hover:bg-slate-800/50',
        done && 'opacity-60'
      )}
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
  )
}
