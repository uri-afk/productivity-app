import { cn } from '../../lib/cn'

// Deterministic color from tag string
const COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
]

function colorFor(tag) {
  let n = 0
  for (let i = 0; i < tag.length; i++) n += tag.charCodeAt(i)
  return COLORS[n % COLORS.length]
}

export default function TagBadge({ tag, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
        colorFor(tag),
        onClick && 'cursor-pointer hover:opacity-80',
        active && 'ring-2 ring-offset-1 ring-blue-500'
      )}
    >
      {tag}
    </button>
  )
}
