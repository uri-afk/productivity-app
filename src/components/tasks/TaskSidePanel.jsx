import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Tag, Plus, ChevronRight, FileText, Table2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import TagBadge from '../ui/TagBadge'
import TaskNoteEditorPanel from './TaskNoteEditorPanel'
import { defaultTable } from '../table/tableCore'
import { useResizable } from '../../hooks/useResizable'

const PRIORITIES = ['high', 'medium', 'low']
const STATUSES = [
  { id: 'todo',        label: 'To Do'       },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'done',        label: 'Done'        },
]

// ── Collapsible section wrapper ─────────────────────────────────────
function Section({ title, badge, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 w-full py-1 text-left group"
      >
        <ChevronRight
          size={13}
          className={cn(
            'text-slate-400 transition-transform duration-150 shrink-0',
            open && 'rotate-90'
          )}
        />
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        {badge != null && (
          <span className="ml-1 text-xs text-slate-400 dark:text-slate-500 font-normal normal-case">
            {badge}
          </span>
        )}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

// ── Subtask row ──────────────────────────────────────────────────────
function SubtaskRow({ sub, onToggle, onRemove }) {
  return (
    <div className="flex items-center gap-2 group py-0.5">
      <button
        onClick={() => onToggle(sub.id)}
        className={cn(
          'w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
          sub.done ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
        )}
      >
        {sub.done && (
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
            <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <span className={cn('flex-1 text-sm', sub.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200')}>
        {sub.title}
      </span>
      <button onClick={() => onRemove(sub.id)} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all">
        <X size={12} />
      </button>
    </div>
  )
}

// ── Subtask list ────────────────────────────────────────────────────
function SubtaskList({ subtasks = [], onChange }) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showFinished, setShowFinished] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function add() {
    const title = newTitle.trim()
    if (!title) { setAdding(false); return }
    onChange([...subtasks, { id: crypto.randomUUID(), title, done: false }])
    setNewTitle('')
    inputRef.current?.focus()
  }

  function toggle(id) {
    onChange(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  function remove(id) {
    onChange(subtasks.filter(s => s.id !== id))
  }

  const open = subtasks.filter(s => !s.done)
  const done = subtasks.filter(s => s.done)

  return (
    <Section
      title="Subtasks"
      badge={subtasks.length > 0 ? `${done.length}/${subtasks.length}` : null}
      defaultOpen
    >
      <div className="space-y-1">
        {open.map(sub => (
          <SubtaskRow key={sub.id} sub={sub} onToggle={toggle} onRemove={remove} />
        ))}

        {adding ? (
          <div className="flex items-center gap-2 py-0.5">
            <div className="w-4 h-4 shrink-0 rounded border-2 border-dashed border-slate-300 dark:border-slate-600" />
            <input
              ref={inputRef}
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); add() }
                if (e.key === 'Escape') { setAdding(false); setNewTitle('') }
              }}
              onBlur={() => { add(); setAdding(false) }}
              placeholder="Subtask title…"
              className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-1 transition-colors"
          >
            <Plus size={12} /> Add subtask
          </button>
        )}

        {/* Finished subtasks */}
        {done.length > 0 && (
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setShowFinished(v => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 py-0.5 transition-colors"
            >
              <ChevronRight size={11} className={cn('transition-transform duration-150', showFinished && 'rotate-90')} />
              Finished ({done.length})
            </button>
            {showFinished && (
              <div className="mt-1 space-y-1">
                {done.map(sub => (
                  <SubtaskRow key={sub.id} sub={sub} onToggle={toggle} onRemove={remove} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}

// ── Notes list ───────────────────────────────────────────────────────
function NotesList({ notes = [], onSelect, onAdd, onRemove }) {
  return (
    <Section title="Notes" badge={notes.length > 0 ? `${notes.length}` : null} defaultOpen>
      <div className="space-y-0.5">
        {notes.map(note => (
          <div
            key={note.id}
            onClick={() => onSelect(note)}
            className="flex items-center gap-2 group py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer"
          >
            {note.type === 'table'
              ? <Table2 size={13} className="text-slate-400 shrink-0" />
              : <FileText size={13} className="text-slate-400 shrink-0" />
            }
            <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 truncate">
              {note.title || <span className="italic text-slate-400">Untitled</span>}
            </span>
            <button
              onClick={e => { e.stopPropagation(); onRemove(note.id) }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2 px-2 pt-1">
          <button onClick={() => onAdd('text')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Plus size={12} /><FileText size={11} /> Text
          </button>
          <button onClick={() => onAdd('table')} className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            <Plus size={12} /><Table2 size={11} /> Table
          </button>
        </div>
      </div>
    </Section>
  )
}

// ── Main side panel ─────────────────────────────────────────────────
export default function TaskSidePanel({ task, onClose, onUpdate, onDelete }) {
  const { width, startResize } = useResizable({ defaultWidth: 384, minWidth: 280, maxWidth: 700 })
  const [form, setForm] = useState(null)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  const [editingNote, setEditingNote] = useState(null)

  useEffect(() => {
    if (task) setForm({
      ...task,
      subtasks: task.subtasks ?? [],
      task_notes: task.task_notes ?? [],
    })
  }, [task?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!task) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [task, onClose])

  if (!task || !form) return null

  function patch(key, value) {
    setForm(f => ({ ...f, [key]: value }))
    onUpdate(task.id, { [key]: value })
  }

  function addTag() {
    const tag = newTag.trim().toLowerCase()
    if (!tag || form.tags?.includes(tag)) return
    patch('tags', [...(form.tags ?? []), tag])
    setNewTag('')
    setAddingTag(false)
  }

  function removeTag(tag) {
    patch('tags', (form.tags ?? []).filter(t => t !== tag))
  }

  function addNote(type = 'text') {
    const newNote = {
      id: crypto.randomUUID(),
      title: type === 'table' ? 'New Table' : '',
      content: type === 'table' ? JSON.stringify(defaultTable()) : '',
      type,
    }
    const updated = [...form.task_notes, newNote]
    patch('task_notes', updated)
    setEditingNote(newNote)
  }

  function removeNote(noteId) {
    // If the note being deleted is currently open, go back
    if (editingNote?.id === noteId) setEditingNote(null)
    patch('task_notes', form.task_notes.filter(n => n.id !== noteId))
  }

  function saveNote(updatedNote) {
    const updated = form.task_notes.map(n => n.id === updatedNote.id ? updatedNote : n)
    // update local form immediately (no patch to avoid excessive Supabase writes from auto-save)
    setForm(f => ({ ...f, task_notes: updated }))
    onUpdate(task.id, { task_notes: updated })
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />

      <aside className="fixed right-0 top-0 bottom-0 z-40 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl" style={{ width }}>
        {/* Resize handle */}
        <div onMouseDown={startResize}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10" />
        {/* Header */}
        <div className="flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 shrink-0"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', paddingBottom: '1rem' }}>
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
                <button key={s.id} onClick={() => patch('status', s.id)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    form.status === s.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  )}>
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
                const colors = { high: 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400', medium: 'border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400', low: 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400' }
                const active  = { high: 'bg-red-600 border-red-600 text-white', medium: 'bg-amber-500 border-amber-500 text-white', low: 'bg-slate-500 border-slate-500 text-white' }
                return (
                  <button key={p} onClick={() => patch('priority', p)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-colors', form.priority === p ? active[p] : colors[p])}>
                    {p}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Due date</label>
            <input type="date" value={form.due_date ?? ''} onChange={e => patch('due_date', e.target.value || null)}
              className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full" />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1">
                  <TagBadge tag={tag} />
                  <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={10} /></button>
                </span>
              ))}
            </div>
            {addingTag ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } if (e.key === 'Escape') setAddingTag(false) }}
                  placeholder="tag name…"
                  className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
                <button onClick={addTag} className="text-xs text-blue-600 font-medium">Add</button>
                <button onClick={() => setAddingTag(false)} className="text-xs text-slate-400">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setAddingTag(true)} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <Tag size={11} /> Add tag
              </button>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 dark:border-slate-800" />

          {/* Subtasks */}
          <SubtaskList
            subtasks={form.subtasks}
            onChange={subtasks => patch('subtasks', subtasks)}
          />

          {/* Notes */}
          <NotesList
            notes={form.task_notes}
            onSelect={setEditingNote}
            onAdd={addNote}
            onRemove={removeNote}
          />

        </div>
      </aside>

      {/* Note editor panel — slides on top */}
      {editingNote && (
        <TaskNoteEditorPanel
          note={editingNote}
          onBack={() => setEditingNote(null)}
          onSave={saveNote}
        />
      )}
    </>
  )
}
