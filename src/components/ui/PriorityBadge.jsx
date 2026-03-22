import { cn } from '../../lib/cn'

const CONFIG = {
  high:   { label: 'High',   dot: 'bg-red-500',   text: 'text-red-600 dark:text-red-400'   },
  medium: { label: 'Medium', dot: 'bg-amber-500',  text: 'text-amber-600 dark:text-amber-400' },
  low:    { label: 'Low',    dot: 'bg-slate-400',  text: 'text-slate-500 dark:text-slate-400' },
}

export default function PriorityBadge({ priority, showLabel = false }) {
  const cfg = CONFIG[priority] ?? CONFIG.medium
  return (
    <span className={cn('inline-flex items-center gap-1.5', cfg.text)}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', cfg.dot)} />
      {showLabel && <span className="text-xs font-medium">{cfg.label}</span>}
    </span>
  )
}
