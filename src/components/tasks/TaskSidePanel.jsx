import { useState, useEffect } from 'react'
import { X, Trash2, Tag, Plus } from 'lucide-react'
import { cn } from '../../lib/cn'
import TagBadge from '../ui/TagBadge'

const PRIORITIES = ['high', 'medium', 'low']
const STATUSES = [
  { id: 'todo',        label: 'To Do'       },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done',        label: 'Done'        },
]

export default function TaskSidePanel({ task, onClose, onUpdate, onDelete }) {
  const [form, setForm] = useState(null)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  useEffect(() => {
    if (task) setForm({ ...task })
  }, [task])

  useEffect(() => {
    if (!task) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [task, onClose])

  if (!task || !form) return null

  function patch(key, value) {
    const updated = { ...form, [key]: value }
    setForm(updated)
    onUpdate(task.id, { [key]: value })
  }

  function addTag() {
    const tag = newTag.trim().toLowerCase()
    if (!tag || form.tags?.includes(tag)) return
    const tags = [...(form.tags ?? []), tag]
    patch('tags', tags)
    setNewTag('')
    setAddingTag(false)
  }

  function removeTag(tag) {
    patch('tags', (form.tags ?? []).filter(t => t !== tag))
  }

  return (
    <>
      {/* Backdrop — mobile */}
      <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={onClose} />

      <aside className="fixed right-0 top-0 bottom-0 z-40 w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Task details</span>
          <div className="flex items-center gap-1">
            <button onClick={() => { onDelete(task.id); onClose() }} className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Title</label>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              onBlur={() => onUpdate(task.id, { title: form.title })}
              className="w-full text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map(s => (
                <button
                  key={s.id}
                  onClick={() => patch('status', s.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    form.status === s.id
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => {
                const colors = {
                  high: 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
                  medium: 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400',
                  low: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400',
                }
                const activeColors = {
                  high: 'bg-red-600 border-red-600 text-white',
                  medium: 'bg-amber-500 border-amber-500 text-white',
                  low: 'bg-slate-500 border-slate-500 text-white',
                }
                return (
                  <button
                    key={p}
                    onClick={() => patch('priority', p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors',
                      form.priority === p ? activeColors[p] : colors[p]
                    )}
                  >
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Due date</label>
            <input
              type="date"
              value={form.due_date ?? ''}
              onChange={e => patch('due_date', e.target.value || null)}
              className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1">
                  <TagBadge tag={tag} />
                  <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            {addingTag ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { e.preventDefault(); addTag() }
                    if (e.key === 'Escape') setAddingTag(false)
                  }}
                  placeholder="tag name…"
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
                <button onClick={addTag} className="text-xs text-blue-600 font-medium">Add</button>
                <button onClick={() => setAddingTag(false)} className="text-xs text-slate-400">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTag(true)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <Tag size={11} /> Add tag
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
