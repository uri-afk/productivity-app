import { useState, useEffect, useRef } from 'react'
import { X, Trash2, Tag, Plus, Bold, Italic, List, ListOrdered, ChevronRight } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '../../lib/cn'
import TagBadge from '../ui/TagBadge'
import { useTheme } from '../../lib/ThemeContext'

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

// ── Subtask list ────────────────────────────────────────────────────
function SubtaskList({ subtasks = [], onChange }) {
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (adding) inputRef.current?.focus()
  }, [adding])

  function add() {
    const title = newTitle.trim()
    if (!title) { setAdding(false); return }
    onChange([...subtasks, { id: crypto.randomUUID(), title, done: false }])
    setNewTitle('')
    // keep adding=true so user can quickly add another
    inputRef.current?.focus()
  }

  function toggle(id) {
    onChange(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s))
  }

  function remove(id) {
    onChange(subtasks.filter(s => s.id !== id))
  }

  const done = subtasks.filter(s => s.done).length

  return (
    <Section
      title="Subtasks"
      badge={subtasks.length > 0 ? `${done}/${subtasks.length}` : null}
      defaultOpen
    >
      <div className="space-y-1">
        {subtasks.map(sub => (
          <div key={sub.id} className="flex items-center gap-2 group py-0.5">
            <button
              onClick={() => toggle(sub.id)}
              className={cn(
                'w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
                sub.done
                  ? 'bg-blue-600 border-blue-600'
                  : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
              )}
            >
              {sub.done && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            <span className={cn(
              'flex-1 text-sm',
              sub.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
            )}>
              {sub.title}
            </span>
            <button
              onClick={() => remove(sub.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
            >
              <X size={12} />
            </button>
          </div>
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
      </div>
    </Section>
  )
}

// ── Task note editor ────────────────────────────────────────────────
function ToolBtn({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={cn(
        'p-1 rounded transition-colors',
        active
          ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

function TaskNoteEditor({ taskId, initialContent, onSave }) {
  const { dark } = useTheme()
  const saveTimeout = useRef(null)
  const [saved, setSaved] = useState(false)
  const wrapperRef = useRef(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[100px] prose prose-sm max-w-none text-sm',
      },
    },
    onUpdate: ({ editor }) => {
      setSaved(false)
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        onSave(editor.getHTML())
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }, 700)
    },
  })

  useEffect(() => {
    editor?.commands.setContent(initialContent ?? '')
  }, [taskId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Click anywhere in the wrapper to focus the editor
  function handleWrapperClick(e) {
    if (e.target === wrapperRef.current) {
      setTimeout(() => {
        const ce = wrapperRef.current?.querySelector('[contenteditable]')
        ce?.focus()
      }, 0)
    }
  }

  return (
    <Section title="Notes" defaultOpen={false}>
      {/* Mini toolbar */}
      <div className="flex items-center gap-0.5 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold">
          <Bold size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic">
          <Italic size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
          <List size={13} />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
          <ListOrdered size={13} />
        </ToolBtn>
        {saved && <span className="ml-auto text-xs text-green-600 dark:text-green-400">Saved</span>}
      </div>

      {/* Editor area — click anywhere to focus */}
      <div
        ref={wrapperRef}
        onClick={handleWrapperClick}
        className="min-h-[100px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 cursor-text"
        style={{ color: dark ? 'rgb(248 250 252)' : 'rgb(15 23 42)' }}
      >
        <EditorContent editor={editor} />
      </div>
    </Section>
  )
}

// ── Main side panel ─────────────────────────────────────────────────
export default function TaskSidePanel({ task, onClose, onUpdate, onDelete }) {
  const [form, setForm] = useState(null)
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  useEffect(() => {
    if (task) setForm({
      ...task,
      subtasks: task.subtasks ?? [],
      description: task.description ?? '',
    })
  }, [task])

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

  return (
    <>
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

          {/* Subtasks — expanded by default */}
          <SubtaskList
            subtasks={form.subtasks}
            onChange={subtasks => patch('subtasks', subtasks)}
          />

          {/* Notes — collapsed by default, click header to expand */}
          <TaskNoteEditor
            taskId={task.id}
            initialContent={form.description}
            onSave={html => onUpdate(task.id, { description: html })}
          />

        </div>
      </aside>
    </>
  )
}
