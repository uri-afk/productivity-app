import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import TaskCard from './TaskCard'
import { cn } from '../../lib/cn'

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: 'bg-slate-400' },
  { id: 'in_progress', label: 'In Progress',  color: 'bg-amber-400' },
  { id: 'done',        label: 'Done',         color: 'bg-green-400' },
]

function Column({ column, tasks, onTaskClick, onAddTask, activeTag, onTagClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  async function handleAdd(e) {
    e.preventDefault()
    if (!title.trim()) return
    await onAddTask({ title: title.trim(), status: column.id })
    setTitle('')
    setAdding(false)
  }

  const filtered = activeTag ? tasks.filter(t => t.tags?.includes(activeTag)) : tasks

  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={cn('w-2 h-2 rounded-full', column.color)} />
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{column.label}</span>
        <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 tabular-nums">{filtered.length}</span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-24 rounded-xl p-2 space-y-2 transition-colors',
          isOver
            ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-dashed border-blue-300 dark:border-blue-700'
            : 'bg-slate-50 dark:bg-slate-800/30'
        )}
      >
        {filtered.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onClick={() => onTaskClick(task)}
            activeTag={activeTag}
            onTagClick={onTagClick}
          />
        ))}
      </div>

      {/* Inline add */}
      <div className="mt-2">
        {adding ? (
          <form onSubmit={handleAdd} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setTitle('') } }}
              placeholder="Task title…"
              className="w-full text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400 mb-2"
            />
            <div className="flex gap-2">
              <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg font-medium">Add</button>
              <button type="button" onClick={() => { setAdding(false); setTitle('') }} className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1">Cancel</button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-1.5 px-2 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <Plus size={13} /> Add task
          </button>
        )}
      </div>
    </div>
  )
}

export default function TaskBoard({ tasks, onUpdateTask, onCreateTask, onSelectTask, activeTag, onTagClick }) {
  const [activeTask, setActiveTask] = useState(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function handleDragStart({ active }) {
    setActiveTask(tasks.find(t => t.id === active.id) ?? null)
  }

  function handleDragEnd({ active, over }) {
    setActiveTask(null)
    if (!over) return
    const task = tasks.find(t => t.id === active.id)
    if (task && task.status !== over.id) {
      onUpdateTask(active.id, { status: over.id })
    }
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 pb-4 overflow-x-auto">
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            column={col}
            tasks={tasks.filter(t => t.status === col.id)}
            onTaskClick={onSelectTask}
            onAddTask={onCreateTask}
            activeTag={activeTag}
            onTagClick={onTagClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTask && <TaskCard task={activeTask} onClick={() => {}} overlay />}
      </DragOverlay>
    </DndContext>
  )
}
