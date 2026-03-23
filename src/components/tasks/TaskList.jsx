import { useState } from 'react'
import { Plus } from 'lucide-react'
import TaskItem from './TaskItem'
import { cn } from '../../lib/cn'

export default function TaskList({ tasks, onToggle, onSelect, onUpdate, onNoteClick, onCreate, activeTag, onTagClick }) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await onCreate({ title: newTitle.trim() })
    setNewTitle('')
    setAdding(false)
  }

  const filtered = activeTag ? tasks.filter(t => t.tags?.includes(activeTag)) : tasks
  const open = filtered.filter(t => t.status !== 'done')
  const done = filtered.filter(t => t.status === 'done')

  return (
    <div className="space-y-1">
      {/* Open tasks */}
      {open.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onClick={onSelect}
          onUpdate={onUpdate}
          onNoteClick={onNoteClick}
          activeTag={activeTag}
          onTagClick={onTagClick}
        />
      ))}

      {open.length === 0 && !adding && (
        <p className="px-3 py-4 text-sm text-slate-400 dark:text-slate-500 text-center">
          {activeTag ? `No open tasks tagged "${activeTag}"` : 'No open tasks — add one below'}
        </p>
      )}

      {/* Inline add */}
      {adding ? (
        <form onSubmit={handleCreate} className="flex items-center gap-2 px-3 py-2">
          <div className="w-4 h-4 shrink-0 rounded border-2 border-slate-300 dark:border-slate-600" />
          <input
            autoFocus
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setNewTitle('') } }}
            placeholder="Task title…"
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button type="submit" className="text-xs text-blue-600 font-medium hover:underline">Add</button>
          <button type="button" onClick={() => { setAdding(false); setNewTitle('') }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <Plus size={14} /> Add task
        </button>
      )}

      {/* Done tasks */}
      {done.length > 0 && (
        <details className="pt-2">
          <summary className="px-3 py-1 text-xs font-medium text-slate-400 dark:text-slate-500 cursor-pointer hover:text-slate-600 dark:hover:text-slate-400 list-none flex items-center gap-1">
            <span className="text-slate-300 dark:text-slate-600">▶</span>
            Completed ({done.length})
          </summary>
          <div className="mt-1 space-y-0.5">
            {done.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onToggle={onToggle}
                onClick={onSelect}
                activeTag={activeTag}
                onTagClick={onTagClick}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
