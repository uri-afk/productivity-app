import { format, isToday, isPast, parseISO, isValid } from 'date-fns'

export function formatDueDate(dateStr) {
  if (!dateStr) return null
  const d = parseISO(dateStr)
  if (!isValid(d)) return null
  if (isToday(d)) return 'Today'
  return format(d, 'MMM d')
}

export function dueDateStatus(dateStr) {
  if (!dateStr) return null
  const d = parseISO(dateStr)
  if (!isValid(d)) return null
  if (isToday(d)) return 'today'
  if (isPast(d)) return 'overdue'
  return 'future'
}
