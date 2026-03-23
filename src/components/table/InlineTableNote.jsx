import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Trash2, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { parseTable, TableGrid } from './tableCore'

export default function InlineTableNote({ note, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [table, setTable] = useState(() => parseTable(note.content))
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [saved, setSaved] = useState(false)
  const [tableHeight, setTableHeight] = useState(null) // null = auto
  const saveTimeout = useRef(null)
  const savedTimer = useRef(null)
  const tableContainerRef = useRef(null)
  const heightDrag = useRef({ on: false, startY: 0, startH: 0 })

  useEffect(() => { setTitle(note.title) }, [note.title])

  // Height resize — document listeners
  useEffect(() => {
    function onMove(e) {
      if (!heightDrag.current.on) return
      const newH = Math.max(80, heightDrag.current.startH + (e.clientY - heightDrag.current.startY))
      setTableHeight(newH)
    }
    function onUp() {
      heightDrag.current.on = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  function startHeightResize(e) {
    e.preventDefault()
    heightDrag.current.on = true
    heightDrag.current.startY = e.clientY
    heightDrag.current.startH = tableHeight ?? (tableContainerRef.current?.offsetHeight ?? 200)
    document.body.style.cursor = 'ns-resize'
    document.body.style.userSelect = 'none'
  }

  function markSaved() {
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function handleTableChange(next) {
    setTable(next)
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(async () => {
      await onUpdate(note.id, { content: JSON.stringify(next) })
      markSaved()
    }, 400)
  }

  function saveTitle() {
    setEditingTitle(false)
    if (title.trim()) onUpdate(note.id, { title: title.trim() })
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-visible bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 group/hdr">
        <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
          <ChevronRight size={14} className={cn('transition-transform duration-150', expanded && 'rotate-90')} />
        </button>

        {editingTitle ? (
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') saveTitle() }}
            className="flex-1 text-sm font-medium bg-transparent outline-none text-slate-900 dark:text-white" />
        ) : (
          // Single click = toggle expand/collapse; double-click = edit title
          <button
            onClick={() => setExpanded(v => !v)}
            onDoubleClick={() => setEditingTitle(true)}
            className="flex-1 text-left text-sm font-medium text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-slate-300"
          >
            {title || <span className="italic text-slate-400">Untitled table</span>}
          </button>
        )}

        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 shrink-0">
            <Check size={11} /> Saved
          </span>
        )}
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
          {table.columns.length} col · {table.rows.length} rows
        </span>
        <button onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover/hdr:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Expanded table */}
      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          <div
            ref={tableContainerRef}
            style={tableHeight ? { height: tableHeight, overflowY: 'auto' } : {}}
          >
            <TableGrid table={table} onChange={handleTableChange} />
          </div>
          {/* Bottom resize handle */}
          <div
            onMouseDown={startHeightResize}
            className="w-full h-2 cursor-ns-resize hover:bg-blue-500/20 transition-colors flex items-center justify-center"
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-200 dark:bg-slate-700" />
          </div>
        </div>
      )}
    </div>
  )
}
