import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../lib/cn'
import TagBadge from '../ui/TagBadge'
import PriorityBadge from '../ui/PriorityBadge'
import { formatDueDate, dueDateStatus } from '../../lib/dates'
import { GripVertical } from 'lucide-react'

const dueDateClass = {
  overdue: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-1.5 rounded',
  today:   'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 rounded',
  future:  'text-slate-400 dark:text-slate-500',
}

export default function TaskCard({ task, onClick, activeTag, onTagClick, overlay }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const dateLabel = formatDueDate(task.due_date)
  const dateStatus = dueDateStatus(task.due_date)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm',
        'cursor-pointer transition-all',
        isDragging && !overlay && 'opacity-40',
        overlay && 'shadow-xl rotate-1 scale-105',
        'hover:border-slate-300 dark:hover:border-slate-600'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          className="mt-0.5 p-0.5 rounded text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab active:cursor-grabbing shrink-0"
        >
          <GripVertical size={13} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white leading-snug">{task.title}</p>

          {(task.tags?.length > 0 || dateLabel) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {task.tags?.map(tag => (
                <TagBadge
                  key={tag}
                  tag={tag}
                  active={activeTag === tag}
                  onClick={e => { e.stopPropagation(); onTagClick?.(tag) }}
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
    </div>
  )
}
