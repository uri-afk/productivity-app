import { useState, useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '../../lib/cn'
import { parseTable, TableGrid } from '../table/tableCore'
import { useResizable } from '../../hooks/useResizable'

export default function TableNoteEditor({ note, onClose, onUpdate }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [table, setTable] = useState(() => parseTable(note?.content))
  const [saved, setSaved] = useState(false)
  const [visible, setVisible] = useState(false)
  const titleTimeout = useRef(null)
  const tableTimeout = useRef(null)
  const savedTimer = useRef(null)
  const { width, startResize } = useResizable({ defaultWidth: 600, minWidth: 360, maxWidth: 1100 })

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    setTitle(note?.title ?? '')
    setTable(parseTable(note?.content))
  }, [note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function markSaved() {
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function handleTableChange(next) {
    setTable(next)
    clearTimeout(tableTimeout.current)
    tableTimeout.current = setTimeout(async () => {
      await onUpdate(note.id, { content: JSON.stringify(next) })
      markSaved()
    }, 400)
  }

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    clearTimeout(titleTimeout.current)
    titleTimeout.current = setTimeout(() => {
      if (val.trim()) { onUpdate(note.id, { title: val.trim() }); markSaved() }
    }, 700)
  }

  if (!note) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className={cn('absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')} onClick={onClose} />

      <div
        className={cn('relative flex flex-col h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out', visible ? 'translate-x-0' : 'translate-x-full')}
        style={{ width }}
      >
        {/* Resize handle */}
        <div onMouseDown={startResize}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10" />

        {/* Top bar */}
        <div className="flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 shrink-0"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)', minHeight: 'calc(2.75rem + env(safe-area-inset-top, 0px))' }}>
          {saved
            ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><Check size={12} /> Saved</span>
            : <span />
          }
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800 shrink-0">
          <input value={title} onChange={handleTitleChange} placeholder="Table title…"
            className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-600 leading-tight" />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-4 py-4">
          <TableGrid table={table} onChange={handleTableChange} />
        </div>
      </div>
    </div>
  )
}
