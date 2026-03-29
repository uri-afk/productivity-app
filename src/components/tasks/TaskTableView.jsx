import React, { useState, useRef, useEffect } from 'react'
import { Plus, ChevronRight, FileText, Check, X, Trash2, FolderSymlink, GripVertical } from 'lucide-react'
import { cn } from '../../lib/cn'
import NoteEditor from '../notes/NoteEditor'

// ── Constants ─────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'todo',        label: 'Open',        color: '#6b7280' },
  { value: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { value: 'done',        label: 'Done',        color: '#22c55e' },
]
const PRIORITY_OPTIONS = [
  { value: 'high',   label: 'High',   color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low',    label: 'Low',    color: '#6b7280' },
]

// ── Helpers ───────────────────────────────────────────────────────
function StatusBadge({ value }) {
  const opt = STATUS_OPTIONS.find(o => o.value === value) ?? STATUS_OPTIONS[0]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap"
      style={{ backgroundColor: opt.color + '20', color: opt.color }}>
      {opt.label}
    </span>
  )
}

function PriorityBadge({ value }) {
  const opt = PRIORITY_OPTIONS.find(o => o.value === value) ?? PRIORITY_OPTIONS[1]
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap capitalize"
      style={{ backgroundColor: opt.color + '20', color: opt.color }}>
      {opt.label}
    </span>
  )
}

function SelectPopup({ options, value, onChange, onClose, upward = false, alignRight = false }) {
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref}
      className={cn(
        'absolute z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[150px]',
        upward ? 'bottom-full mb-1' : 'top-full mt-1',
        alignRight ? 'right-0 left-auto' : 'left-0',
      )}>
      {options.map(opt => (
        <button key={opt.value}
          onMouseDown={e => { e.preventDefault(); onChange(opt.value); onClose() }}
          className={cn(
            'w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition-colors',
            value === opt.value && 'font-semibold'
          )}>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: opt.color }} />
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function popupDir(e) {
  const r = e.currentTarget.getBoundingClientRect()
  return { upward: window.innerHeight - r.bottom < 160, alignRight: window.innerWidth - r.right < 160 }
}

// ── Task notes side panel (wraps NoteEditor) ──────────────────────
// onSaveContent(content) — optional override for subtask notes
function TaskNotesPanel({ task, allTasks, onClose, onUpdateTask, onSaveContent }) {
  const current = onSaveContent ? task : (allTasks.find(t => t.id === task.id) ?? task)
  const note = {
    id: current.id,
    title: current.title,
    content: typeof current.task_notes === 'string' ? current.task_notes : '',
  }
  function handleUpdate(id, updates) {
    if (updates.content !== undefined) {
      if (onSaveContent) onSaveContent(updates.content)
      else onUpdateTask(id, { task_notes: updates.content })
    }
    if (updates.title !== undefined && !onSaveContent) {
      onUpdateTask(id, { title: updates.title })
    }
  }
  return <NoteEditor note={note} onClose={onClose} onUpdate={handleUpdate} />
}

// ── Table header ──────────────────────────────────────────────────
function TableHeader() {
  return (
    <tr className="border-b border-slate-200 dark:border-slate-700">
      <th className="w-8" />
      <th className="w-6" />
      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Name</th>
      <th className="w-28 px-2 py-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Status</th>
      <th className="w-28 px-2 py-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Due Date</th>
      <th className="w-24 px-2 py-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Priority</th>
      <th className="w-36 px-2 py-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Tags</th>
      <th className="w-20 px-2 py-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Comments</th>
      <th className="w-6" />
    </tr>
  )
}

// ── TaskRow ───────────────────────────────────────────────────────
function TaskRow({
  task, isSubtask = false,
  sections = [],
  activeCell, onSetActiveCell,
  onUpdate, onDelete,
  expandedSubtasks, onToggleExpand, onAddSubtask,
  onOpenNotes, onEnterPressed,
  onDragStart, onDragEnd,
}) {
  const id = task.id
  const titleRef = useRef(null)
  const [statusOpen, setStatusOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [sectionOpen, setSectionOpen] = useState(false)
  const [statusDir, setStatusDir] = useState({ upward: false, alignRight: false })
  const [priorityDir, setPriorityDir] = useState({ upward: false, alignRight: false })
  const [sectionDir, setSectionDir] = useState({ upward: false, alignRight: false })
  const [tagInput, setTagInput] = useState('')

  const isActive = f => activeCell?.rowId === id && activeCell?.field === f
  const hasSubtasks = (task.subtasks ?? []).length > 0
  const isExpanded = expandedSubtasks?.has(id)
  const done = task.status === 'done'

  useEffect(() => {
    if (isActive('title') && titleRef.current) {
      titleRef.current.focus()
      const len = titleRef.current.value?.length ?? 0
      titleRef.current.setSelectionRange(len, len)
    }
  }, [activeCell?.rowId, activeCell?.field]) // eslint-disable-line

  const FIELDS = ['title', 'status', 'due_date', 'priority', 'tags']
  function nextField(f) { const i = FIELDS.indexOf(f); return FIELDS[i + 1] ?? null }

  function tab(e, field) {
    e.preventDefault()
    const next = nextField(field)
    if (next) onSetActiveCell({ rowId: id, field: next })
    else onSetActiveCell(null)
  }

  function enter(saveVal) {
    if (saveVal !== undefined) onUpdate(id, saveVal)
    onSetActiveCell(null)
    onEnterPressed?.()
  }

  return (
    <tr
      data-task-id={id}
      draggable={!isSubtask}
      onDragStart={!isSubtask ? (e) => { e.dataTransfer.effectAllowed = 'move'; onDragStart?.(id) } : undefined}
      onDragEnd={!isSubtask ? () => onDragEnd?.() : undefined}
      className={cn(
        'group/row border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/20',
        done && 'opacity-50',
        !isSubtask && 'cursor-grab active:cursor-grabbing'
      )}>
      {/* Checkbox + drag grip */}
      <td className="w-8 px-2 py-2">
        <div className="flex items-center gap-1">
          {!isSubtask && (
            <GripVertical size={11} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover/row:opacity-100 shrink-0 -ml-1" />
          )}
          <button
            onClick={() => onUpdate(id, { status: done ? 'todo' : 'done' })}
            className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
              done ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
            )}>
            {done && <Check size={9} className="text-white" strokeWidth={3} />}
          </button>
        </div>
      </td>

      {/* Subtask toggle / add */}
      <td className="w-6 py-2">
        {!isSubtask && (
          hasSubtasks ? (
            <button onClick={() => onToggleExpand(id)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <ChevronRight size={13} className={cn('transition-transform duration-150', isExpanded && 'rotate-90')} />
            </button>
          ) : (
            <button onClick={() => onAddSubtask(task)} title="Add subtask"
              className="text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-colors">
              <Plus size={12} />
            </button>
          )
        )}
      </td>

      {/* Name */}
      <td
        className={cn('py-2 cursor-text', isSubtask ? 'pl-8 pr-3' : 'px-3')}
        onClick={() => !isActive('title') && onSetActiveCell({ rowId: id, field: 'title' })}>
        {isActive('title') ? (
          <input ref={titleRef}
            defaultValue={task.title}
            onBlur={e => { onUpdate(id, { title: e.target.value }); onSetActiveCell(null) }}
            onKeyDown={e => {
              if (e.key === 'Tab') { onUpdate(id, { title: e.currentTarget.value }); tab(e, 'title') }
              if (e.key === 'Enter') { e.preventDefault(); enter({ title: e.currentTarget.value }) }
              if (e.key === 'Escape') { onUpdate(id, { title: e.currentTarget.value }); onSetActiveCell(null) }
            }}
            className={cn('w-full bg-transparent outline-none text-sm text-slate-900 dark:text-white', done && 'line-through')}
          />
        ) : (
          <span className={cn('text-sm truncate block', done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white')}>
            {task.title || <span className="text-slate-300 dark:text-slate-600 italic text-xs">Untitled</span>}
          </span>
        )}
      </td>

      {/* Status */}
      <td className="w-28 px-2 py-2 relative">
        <div className="cursor-pointer"
          onClick={(e) => { setStatusDir(popupDir(e)); onSetActiveCell({ rowId: id, field: 'status' }); setStatusOpen(true) }}>
          <StatusBadge value={task.status} />
        </div>
        {isActive('status') && statusOpen && (
          <SelectPopup
            options={STATUS_OPTIONS} value={task.status}
            onChange={val => onUpdate(id, { status: val })}
            onClose={() => { setStatusOpen(false); onSetActiveCell(null) }}
            upward={statusDir.upward} alignRight={statusDir.alignRight}
          />
        )}
      </td>

      {/* Due Date */}
      <td className="w-28 px-2 py-2 cursor-text"
        onClick={() => !isActive('due_date') && onSetActiveCell({ rowId: id, field: 'due_date' })}>
        {isActive('due_date') ? (
          <input type="date" autoFocus
            defaultValue={task.due_date ?? ''}
            onBlur={e => { onUpdate(id, { due_date: e.target.value || null }); onSetActiveCell(null) }}
            onKeyDown={e => {
              if (e.key === 'Tab') tab(e, 'due_date')
              if (e.key === 'Enter') { e.preventDefault(); enter({ due_date: e.currentTarget.value || null }) }
              if (e.key === 'Escape') onSetActiveCell(null)
            }}
            className="w-full text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300"
          />
        ) : (
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {task.due_date || <span className="text-slate-300 dark:text-slate-600">—</span>}
          </span>
        )}
      </td>

      {/* Priority */}
      <td className="w-24 px-2 py-2 relative">
        <div className="cursor-pointer"
          onClick={(e) => { setPriorityDir(popupDir(e)); onSetActiveCell({ rowId: id, field: 'priority' }); setPriorityOpen(true) }}>
          <PriorityBadge value={task.priority} />
        </div>
        {isActive('priority') && priorityOpen && (
          <SelectPopup
            options={PRIORITY_OPTIONS} value={task.priority}
            onChange={val => onUpdate(id, { priority: val })}
            onClose={() => { setPriorityOpen(false); onSetActiveCell(null) }}
            upward={priorityDir.upward} alignRight={priorityDir.alignRight}
          />
        )}
      </td>

      {/* Tags */}
      <td className="w-36 px-2 py-1.5 cursor-text"
        onClick={() => onSetActiveCell({ rowId: id, field: 'tags' })}>
        <div className="flex flex-wrap gap-1 items-center min-h-[26px]">
          {(task.tags ?? []).map(tag => (
            <span key={tag}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 shrink-0">
              {tag}
              {isActive('tags') && (
                <button
                  onMouseDown={e => { e.stopPropagation(); onUpdate(id, { tags: (task.tags ?? []).filter(t => t !== tag) }) }}
                  className="hover:text-red-500 leading-none ml-0.5">
                  <X size={8} />
                </button>
              )}
            </span>
          ))}
          {isActive('tags') ? (
            <input autoFocus
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  const t = tagInput.trim().toLowerCase()
                  if (t && !(task.tags ?? []).includes(t)) onUpdate(id, { tags: [...(task.tags ?? []), t] })
                  setTagInput('')
                }
                if (e.key === 'Tab') { setTagInput(''); tab(e, 'tags') }
                if (e.key === 'Escape') { setTagInput(''); onSetActiveCell(null) }
              }}
              onBlur={() => { setTagInput(''); onSetActiveCell(null) }}
              placeholder={(task.tags ?? []).length === 0 ? 'Add tag…' : '+tag'}
              className="min-w-[50px] text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-300"
            />
          ) : (task.tags ?? []).length === 0 && (
            <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
          )}
        </div>
      </td>

      {/* Notes icon */}
      <td className="w-20 px-2 py-2">
        <button onClick={() => onOpenNotes(task)}
          className={cn(
            'p-1 rounded transition-colors',
            task.task_notes
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-slate-300 dark:text-slate-600 hover:text-blue-500'
          )}>
          <FileText size={13} />
        </button>
      </td>

      {/* Actions: move to section + delete */}
      <td className="w-12 py-2 pr-2">
        <div className="flex items-center gap-1 justify-end">
          {!isSubtask && sections.length > 1 && (
            <div className="relative">
              <button
                onClick={(e) => { setSectionDir(popupDir(e)); onSetActiveCell({ rowId: id, field: 'section' }); setSectionOpen(true) }}
                title="Move to section"
                className="p-0.5 text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-colors">
                <FolderSymlink size={12} />
              </button>
              {isActive('section') && sectionOpen && (
                <SelectPopup
                  options={sections.map(s => ({ value: s.id, label: s.name, color: '#6366f1' }))}
                  value={task.section_id ?? 'general'}
                  onChange={val => { onUpdate(id, { section_id: val }) }}
                  onClose={() => { setSectionOpen(false); onSetActiveCell(null) }}
                  upward={sectionDir.upward} alignRight={sectionDir.alignRight}
                />
              )}
            </div>
          )}
          <button onClick={() => onDelete(task.id)}
            className="p-0.5 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors">
            <X size={12} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── New task input row ────────────────────────────────────────────
function NewTaskRow({ sectionId, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const inputRef = useRef(null)
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => { inputRef.current?.focus() }, [])

  function save() {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      status: 'todo',
      priority: 'medium',
      due_date: today,
      tags: [],
      section_id: sectionId,
    })
    setTitle('')
    inputRef.current?.focus()
  }

  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10">
      <td className="w-8 px-2 py-2">
        <div className="w-4 h-4 rounded border-2 border-dashed border-slate-300 dark:border-slate-600" />
      </td>
      <td className="w-6" />
      <td className="px-3 py-2" colSpan={6}>
        <input
          ref={inputRef}
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); save() }
            if (e.key === 'Escape') onCancel()
          }}
          onBlur={() => { if (!title.trim()) onCancel() }}
          placeholder="Task name… (Enter to add, Escape to cancel)"
          className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
        />
      </td>
      <td className="w-6 py-2 pr-2">
        <button onClick={onCancel} className="p-0.5 text-slate-400 hover:text-slate-600">
          <X size={12} />
        </button>
      </td>
    </tr>
  )
}

// ── Mobile task row (phones only) ────────────────────────────────
function MobileTaskRow({ task, isSubtask = false, onUpdate, onDelete, onOpenNotes, sections = [], onAddSubtask }) {
  const [editing, setEditing] = useState(false)
  const [titleVal, setTitleVal] = useState(task.title)
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef(null)
  const done = task.status === 'done'
  const hasSubtasks = (task.subtasks ?? []).length > 0

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  function commitTitle() { onUpdate(task.id, { title: titleVal }); setEditing(false) }

  return (
    <>
      <div className={cn(
        'flex items-start gap-3 px-3 py-3 border-b border-slate-100 dark:border-slate-800',
        done && 'opacity-50',
        isSubtask && 'pl-8 bg-slate-50/50 dark:bg-slate-800/20'
      )}>
        {/* Checkbox */}
        <button
          onClick={() => onUpdate(task.id, { status: done ? 'todo' : 'done' })}
          className={cn(
            'w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
            done ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600 hover:border-blue-500'
          )}>
          {done && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input ref={inputRef}
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              onBlur={commitTitle}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') commitTitle() }}
              className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-white border-b border-blue-500 pb-0.5"
            />
          ) : (
            <span
              onClick={() => { setTitleVal(task.title); setEditing(true) }}
              className={cn('text-sm block cursor-text', done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white')}>
              {task.title || <span className="text-slate-300 dark:text-slate-600 italic text-xs">Untitled</span>}
            </span>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <StatusBadge value={task.status} />
            {task.due_date && <span className="text-xs text-slate-500 dark:text-slate-400">{task.due_date}</span>}
            <PriorityBadge value={task.priority} />
            {(task.tags ?? []).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{tag}</span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          {!isSubtask && (
            <button onClick={() => { if (hasSubtasks) setExpanded(v => !v); else onAddSubtask?.(task) }}
              className="p-1.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
              <ChevronRight size={14} className={cn('transition-transform duration-150', expanded && 'rotate-90')} />
            </button>
          )}
          <button onClick={() => onOpenNotes(task)}
            className={cn('p-1.5 rounded transition-colors', task.task_notes ? 'text-blue-500 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600 hover:text-blue-500')}>
            <FileText size={14} />
          </button>
          <button onClick={() => onDelete(task.id)}
            className="p-1.5 rounded text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Subtasks (expanded) */}
      {!isSubtask && expanded && (task.subtasks ?? []).map(sub => (
        <MobileTaskRow key={sub.id} task={sub} isSubtask
          onUpdate={(_, changes) => onUpdate(task.id, { subtasks: (task.subtasks ?? []).map(s => s.id === sub.id ? { ...s, ...changes } : s) })}
          onDelete={() => onUpdate(task.id, { subtasks: (task.subtasks ?? []).filter(s => s.id !== sub.id) })}
          onOpenNotes={onOpenNotes}
        />
      ))}
    </>
  )
}

// ── Mobile new-task input ─────────────────────────────────────────
function MobileNewTaskRow({ sectionId, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const ref = useRef(null)
  const today = new Date().toISOString().split('T')[0]
  useEffect(() => { ref.current?.focus() }, [])
  function save() {
    if (!title.trim()) return
    onSave({ title: title.trim(), status: 'todo', priority: 'medium', due_date: today, tags: [], section_id: sectionId })
    setTitle('')
    ref.current?.focus()
  }
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-900/10">
      <div className="w-5 h-5 rounded border-2 border-dashed border-slate-300 dark:border-slate-600 shrink-0" />
      <input ref={ref} value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); save() } if (e.key === 'Escape') onCancel() }}
        onBlur={() => { if (!title.trim()) onCancel() }}
        placeholder="Task name… (Enter to add)"
        className="flex-1 bg-transparent outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
      />
      <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-600 shrink-0"><X size={13} /></button>
    </div>
  )
}

// ── Column widths colgroup ────────────────────────────────────────
function TableColgroup() {
  return (
    <colgroup>
      <col style={{ width: 32 }} />
      <col style={{ width: 24 }} />
      <col />
      <col style={{ width: 120 }} />
      <col style={{ width: 112 }} />
      <col style={{ width: 96 }} />
      <col style={{ width: 144 }} />
      <col style={{ width: 80 }} />
      <col style={{ width: 48 }} />
    </colgroup>
  )
}

// ── TaskSection ───────────────────────────────────────────────────
function TaskSection({
  section, tasks, allSections, collapsed, onToggleCollapse,
  renaming, onStartRename, onRename, canDelete, onDelete,
  onCreate, onUpdate, onDeleteTask, onOpenNotes, isFirst,
  draggingTaskId, onDragStart, onDragEnd, onDropTask,
}) {
  const [activeCell, setActiveCell] = useState(null)
  const [expandedSubtasks, setExpandedSubtasks] = useState(new Set())
  const [addingTask, setAddingTask] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [renameVal, setRenameVal] = useState(section.name)
  const [dragOver, setDragOver] = useState(false)
  const renameRef = useRef(null)

  useEffect(() => {
    setRenameVal(section.name)
  }, [section.name])

  useEffect(() => {
    if (renaming) renameRef.current?.focus()
  }, [renaming])

  // Listen for global "open add task" (from top nav + New button)
  useEffect(() => {
    if (!isFirst) return
    function handler() { setAddingTask(true); setActiveCell(null) }
    document.addEventListener('open-add-task', handler)
    return () => document.removeEventListener('open-add-task', handler)
  }, [isFirst])

  function toggleExpand(taskId) {
    setExpandedSubtasks(prev => {
      const next = new Set(prev)
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId)
      return next
    })
  }

  function handleAddSubtask(task) {
    const newSub = {
      id: crypto.randomUUID(),
      title: '',
      status: 'todo',
      priority: 'medium',
      due_date: null,
      tags: [],
    }
    onUpdate(task.id, { subtasks: [...(task.subtasks ?? []), newSub] })
    setExpandedSubtasks(prev => new Set([...prev, task.id]))
    setActiveCell({ rowId: newSub.id, field: 'title' })
  }

  function updateSubtask(parentId, subId, changes) {
    const task = tasks.find(t => t.id === parentId)
    if (!task) return
    onUpdate(parentId, { subtasks: (task.subtasks ?? []).map(s => s.id === subId ? { ...s, ...changes } : s) })
  }

  function deleteSubtask(parentId, subId) {
    const task = tasks.find(t => t.id === parentId)
    if (!task) return
    onUpdate(parentId, { subtasks: (task.subtasks ?? []).filter(s => s.id !== subId) })
  }

  async function handleCreate(fields) {
    await onCreate(fields)
    // NewTaskRow manages its own "stay open" behavior
  }

  const activeTasks = tasks.filter(t => t.status !== 'done')
  const completedTasks = tasks.filter(t => t.status === 'done')

  return (
    <div
      onDragOver={draggingTaskId ? (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOver(true) } : undefined}
      onDragLeave={draggingTaskId ? () => setDragOver(false) : undefined}
      onDrop={draggingTaskId ? (e) => { e.preventDefault(); setDragOver(false); onDropTask?.(draggingTaskId, section.id) } : undefined}
      className={cn(dragOver && 'ring-2 ring-blue-400 ring-inset rounded-xl')}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2 group/sec">
        <button onClick={onToggleCollapse} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0">
          <ChevronRight size={14} className={cn('transition-transform duration-150', !collapsed && 'rotate-90')} />
        </button>

        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={() => onRename(renameVal.trim() || section.name)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRename(renameVal.trim() || section.name)
              if (e.key === 'Escape') onRename(section.name)
            }}
            className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-transparent outline-none border-b border-blue-500 min-w-[80px]"
          />
        ) : (
          <button onDoubleClick={onStartRename}
            className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            {section.name}
          </button>
        )}

        <span className="text-xs text-slate-400 dark:text-slate-500">{activeTasks.length}</span>

        {canDelete && (
          <button onClick={onDelete}
            className="opacity-0 group-hover/sec:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all">
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">

          {/* ── Mobile layout (phones) ── */}
          <div className="md:hidden">
            {activeTasks.map(task => (
              <MobileTaskRow key={task.id} task={task}
                sections={allSections}
                onUpdate={onUpdate} onDelete={onDeleteTask}
                onOpenNotes={onOpenNotes}
                onAddSubtask={handleAddSubtask}
              />
            ))}
            {addingTask && (
              <MobileNewTaskRow sectionId={section.id} onSave={handleCreate} onCancel={() => setAddingTask(false)} />
            )}
            {!addingTask && (
              <button onClick={() => setAddingTask(true)}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 w-full transition-colors">
                <Plus size={13} /> Add task
              </button>
            )}
            {completedTasks.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => setShowCompleted(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 w-full transition-colors">
                  <ChevronRight size={12} className={cn('transition-transform duration-150', showCompleted && 'rotate-90')} />
                  {completedTasks.length} completed
                </button>
                {showCompleted && completedTasks.map(task => (
                  <MobileTaskRow key={task.id} task={task}
                    sections={allSections}
                    onUpdate={onUpdate} onDelete={onDeleteTask}
                    onOpenNotes={onOpenNotes}
                    onAddSubtask={handleAddSubtask}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Desktop table layout ── */}
          <table className="hidden md:table w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
            <TableColgroup />
            <thead><TableHeader /></thead>
            <tbody>
              {activeTasks.map(task => (
                // eslint-disable-next-line react/jsx-key
                <React.Fragment key={task.id}>
                  <TaskRow
                    task={task}
                    sections={allSections}
                    activeCell={activeCell}
                    onSetActiveCell={setActiveCell}
                    onUpdate={onUpdate}
                    onDelete={onDeleteTask}
                    expandedSubtasks={expandedSubtasks}
                    onToggleExpand={toggleExpand}
                    onAddSubtask={handleAddSubtask}
                    onOpenNotes={onOpenNotes}
                    onEnterPressed={() => { setAddingTask(true); setActiveCell(null) }}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                  {expandedSubtasks.has(task.id) && (() => {
                    const allSubs = task.subtasks ?? []
                    const activeSubs = allSubs.filter(s => s.status !== 'done')
                    const doneSubs = allSubs.filter(s => s.status === 'done')
                    return <>
                      {activeSubs.map(sub => (
                        <TaskRow
                          key={sub.id}
                          task={sub}
                          isSubtask
                          activeCell={activeCell}
                          onSetActiveCell={setActiveCell}
                          onUpdate={(_, changes) => updateSubtask(task.id, sub.id, changes)}
                          onDelete={() => deleteSubtask(task.id, sub.id)}
                          expandedSubtasks={new Set()}
                          onToggleExpand={() => {}}
                          onAddSubtask={() => {}}
                          onOpenNotes={() => onOpenNotes(sub, (content) => updateSubtask(task.id, sub.id, { task_notes: content }))}
                          onEnterPressed={null}
                        />
                      ))}
                      {/* Add subtask button row */}
                      <tr key={`add-sub-${task.id}`} className="border-b border-slate-100 dark:border-slate-800">
                        <td /><td />
                        <td className="pl-8 py-1.5" colSpan={7}>
                          <button onClick={() => handleAddSubtask(task)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors">
                            <Plus size={11} /> Add subtask
                          </button>
                        </td>
                      </tr>
                      {/* Done subtasks */}
                      {doneSubs.length > 0 && doneSubs.map(sub => (
                        <TaskRow
                          key={sub.id}
                          task={sub}
                          isSubtask
                          activeCell={activeCell}
                          onSetActiveCell={setActiveCell}
                          onUpdate={(_, changes) => updateSubtask(task.id, sub.id, changes)}
                          onDelete={() => deleteSubtask(task.id, sub.id)}
                          expandedSubtasks={new Set()}
                          onToggleExpand={() => {}}
                          onAddSubtask={() => {}}
                          onOpenNotes={() => onOpenNotes(sub, (content) => updateSubtask(task.id, sub.id, { task_notes: content }))}
                          onEnterPressed={null}
                        />
                      ))}
                    </>
                  })()}
                </React.Fragment>
              ))}

              {addingTask && (
                <NewTaskRow
                  sectionId={section.id}
                  onSave={handleCreate}
                  onCancel={() => setAddingTask(false)}
                />
              )}
            </tbody>
          </table>

          <div className="hidden md:block">
            {!addingTask && (
              <button
                onClick={() => setAddingTask(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 w-full transition-colors">
                <Plus size={13} /> Add task
              </button>
            )}

            {completedTasks.length > 0 && (
              <div className="border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setShowCompleted(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-400 w-full transition-colors">
                  <ChevronRight size={12} className={cn('transition-transform duration-150', showCompleted && 'rotate-90')} />
                  {completedTasks.length} completed
                </button>
                {showCompleted && (
                  <table className="w-full border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
                    <TableColgroup />
                    <tbody>
                      {completedTasks.map(task => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          sections={allSections}
                          activeCell={activeCell}
                          onSetActiveCell={setActiveCell}
                          onUpdate={onUpdate}
                          onDelete={onDeleteTask}
                          expandedSubtasks={expandedSubtasks}
                          onToggleExpand={toggleExpand}
                          onAddSubtask={handleAddSubtask}
                          onOpenNotes={onOpenNotes}
                          onEnterPressed={() => {}}
                          onDragStart={onDragStart}
                          onDragEnd={onDragEnd}
                        />
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main TaskTableView ────────────────────────────────────────────
export default function TaskTableView({ tasks, project, onCreateTask, onUpdateTask, onDeleteTask, onUpdateProject, highlightTaskId }) {
  const sections = project?.task_sections ?? [{ id: 'general', name: 'General' }]
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [renamingSection, setRenamingSection] = useState(null)
  const [draggingTaskId, setDraggingTaskId] = useState(null)

  // Scroll to and briefly flash the highlighted task
  useEffect(() => {
    if (!highlightTaskId) return
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-task-id="${highlightTaskId}"]`)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.style.transition = 'background-color 0.3s'
      el.style.backgroundColor = 'rgba(59,130,246,0.15)'
      setTimeout(() => { el.style.backgroundColor = '' }, 1500)
    }, 300)
    return () => clearTimeout(timer)
  }, [highlightTaskId])
  // notePanel: { task, onSaveContent? } — onSaveContent is set for subtask notes
  const [notePanel, setNotePanel] = useState(null)

  function toggleSection(id) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function addSection() {
    const id = `s_${Date.now()}`
    const updated = [...sections, { id, name: 'New Section' }]
    await onUpdateProject(project.id, { task_sections: updated })
    setRenamingSection(id)
  }

  async function renameSection(sectionId, name) {
    const updated = sections.map(s => s.id === sectionId ? { ...s, name } : s)
    await onUpdateProject(project.id, { task_sections: updated })
    setRenamingSection(null)
  }

  async function deleteSection(sectionId) {
    const reassigned = tasks.filter(t => (t.section_id ?? 'general') === sectionId)
    await Promise.all(reassigned.map(t => onUpdateTask(t.id, { section_id: 'general' })))
    await onUpdateProject(project.id, { task_sections: sections.filter(s => s.id !== sectionId) })
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <TaskSection
          key={section.id}
          section={section}
          tasks={tasks.filter(t => (t.section_id ?? 'general') === section.id)}
          allSections={sections}
          collapsed={collapsedSections.has(section.id)}
          onToggleCollapse={() => toggleSection(section.id)}
          renaming={renamingSection === section.id}
          onStartRename={() => setRenamingSection(section.id)}
          onRename={name => renameSection(section.id, name)}
          canDelete={section.id !== 'general'}
          onDelete={() => deleteSection(section.id)}
          onCreate={onCreateTask}
          onUpdate={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onOpenNotes={(task, onSaveContent) => setNotePanel({ task, onSaveContent })}
          isFirst={idx === 0}
          draggingTaskId={draggingTaskId}
          onDragStart={(taskId) => setDraggingTaskId(taskId)}
          onDragEnd={() => setDraggingTaskId(null)}
          onDropTask={(taskId, targetSectionId) => {
            setDraggingTaskId(null)
            onUpdateTask(taskId, { section_id: targetSectionId })
          }}
        />
      ))}

      <button
        onClick={addSection}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 transition-colors">
        <Plus size={14} /> Add section
      </button>

      {notePanel && (
        <TaskNotesPanel
          task={notePanel.task}
          allTasks={tasks}
          onClose={() => setNotePanel(null)}
          onUpdateTask={onUpdateTask}
          onSaveContent={notePanel.onSaveContent}
        />
      )}
    </div>
  )
}
