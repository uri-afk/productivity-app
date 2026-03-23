import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Plus, Check, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'

function parseTable(content) {
  try {
    const parsed = JSON.parse(content)
    if (parsed?.columns && parsed?.rows) return parsed
  } catch {}
  return { columns: ['Column 1', 'Column 2', 'Column 3'], rows: [['', '', ''], ['', '', '']] }
}

export default function TableNoteEditor({ note, onClose, onUpdate }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [table, setTable] = useState(() => parseTable(note?.content))
  const [saved, setSaved] = useState(false)
  const [visible, setVisible] = useState(false)
  const titleTimeout = useRef(null)
  const tableTimeout = useRef(null)
  const savedTimer = useRef(null)

  // Slide-in animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Escape to close
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Sync if note switches
  useEffect(() => {
    setTitle(note?.title ?? '')
    setTable(parseTable(note?.content))
  }, [note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function markSaved() {
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function saveTable(next) {
    clearTimeout(tableTimeout.current)
    tableTimeout.current = setTimeout(() => {
      onUpdate(note.id, { content: JSON.stringify(next) })
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

  function updateCell(ri, ci, val) {
    const next = { ...table, rows: table.rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r) }
    setTable(next)
    saveTable(next)
  }

  function updateHeader(ci, val) {
    const next = { ...table, columns: table.columns.map((c, i) => i === ci ? val : c) }
    setTable(next)
    saveTable(next)
  }

  function addRow() {
    const next = { ...table, rows: [...table.rows, table.columns.map(() => '')] }
    setTable(next)
    saveTable(next)
  }

  function addColumn() {
    const next = {
      columns: [...table.columns, `Column ${table.columns.length + 1}`],
      rows: table.rows.map(r => [...r, '']),
    }
    setTable(next)
    saveTable(next)
  }

  function deleteRow(ri) {
    const next = { ...table, rows: table.rows.filter((_, i) => i !== ri) }
    setTable(next)
    saveTable(next)
  }

  function deleteColumn(ci) {
    const next = {
      columns: table.columns.filter((_, i) => i !== ci),
      rows: table.rows.map(r => r.filter((_, i) => i !== ci)),
    }
    setTable(next)
    saveTable(next)
  }

  if (!note) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={cn('absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={cn(
        'relative flex flex-col h-full w-full sm:w-2/3 lg:w-1/2 min-w-0',
        'bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl',
        'transition-transform duration-300 ease-out',
        visible ? 'translate-x-0' : 'translate-x-full'
      )}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 h-11 border-b border-slate-200 dark:border-slate-800 shrink-0">
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
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Table title…"
            className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-600 leading-tight"
          />
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto px-6 py-5">
          <div className="inline-block min-w-full">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  {table.columns.map((col, ci) => (
                    <th key={ci} className="group/col relative border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[140px]">
                      <input
                        value={col}
                        onChange={e => updateHeader(ci, e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide bg-transparent outline-none"
                      />
                      {table.columns.length > 1 && (
                        <button
                          onClick={() => deleteColumn(ci)}
                          className="absolute top-1 right-1 opacity-0 group-hover/col:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </th>
                  ))}
                  {/* Add column */}
                  <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-9">
                    <button
                      onClick={addColumn}
                      className="w-full h-full flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-2 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, ri) => (
                  <tr key={ri} className="group/row">
                    {row.map((cell, ci) => (
                      <td key={ci} className="border border-slate-200 dark:border-slate-700">
                        <input
                          value={cell}
                          onChange={e => updateCell(ri, ci, e.target.value)}
                          className="w-full px-3 py-2 text-slate-800 dark:text-slate-200 bg-transparent outline-none focus:bg-blue-50/50 dark:focus:bg-blue-900/10"
                        />
                      </td>
                    ))}
                    {/* Row delete */}
                    <td className="border border-transparent w-9">
                      <button
                        onClick={() => deleteRow(ri)}
                        className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center w-full py-2 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Add row */}
            <button
              onClick={addRow}
              className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-1"
            >
              <Plus size={12} /> Add row
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
