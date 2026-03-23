import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Plus, X, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { COL_TYPES, defaultTable, parseTable, Cell, ColTypeMenu } from './tableCore'

// ── Main component ───────────────────────────────────────────────────
export default function InlineTableNote({ note, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [table, setTable] = useState(() => parseTable(note.content))
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [typeMenuCol, setTypeMenuCol] = useState(null)
  const saveTimeout = useRef(null)

  // Sync if note prop changes (e.g. real-time update)
  useEffect(() => {
    setTitle(note.title)
  }, [note.title])

  function save(next) {
    setTable(next)
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      onUpdate(note.id, { content: JSON.stringify(next) })
    }, 400)
  }

  function updateCell(rowId, colId, val) {
    save({ ...table, rows: table.rows.map(r => r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r) })
  }

  function updateHeader(colId, val) {
    save({ ...table, columns: table.columns.map(c => c.id === colId ? { ...c, name: val } : c) })
  }

  function updateColType(colId, type, options) {
    save({ ...table, columns: table.columns.map(c => c.id === colId ? { ...c, type, options: options ?? [] } : c) })
    setTypeMenuCol(null)
  }

  function addRow() {
    const cells = Object.fromEntries(table.columns.map(c => [c.id, '']))
    save({ ...table, rows: [...table.rows, { id: `r${Date.now()}`, cells }] })
  }

  function addColumn() {
    const id = `c${Date.now()}`
    save({
      columns: [...table.columns, { id, name: `Column ${table.columns.length + 1}`, type: 'text', options: [] }],
      rows: table.rows.map(r => ({ ...r, cells: { ...r.cells, [id]: '' } })),
    })
  }

  function deleteRow(rowId) {
    save({ ...table, rows: table.rows.filter(r => r.id !== rowId) })
  }

  function deleteColumn(colId) {
    const { [colId]: _, ...rest } = {}
    save({
      columns: table.columns.filter(c => c.id !== colId),
      rows: table.rows.map(r => {
        const cells = { ...r.cells }
        delete cells[colId]
        return { ...r, cells }
      }),
    })
  }

  function saveTitle() {
    setEditingTitle(false)
    if (title.trim()) onUpdate(note.id, { title: title.trim() })
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-visible bg-white dark:bg-slate-900">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2.5 group/hdr">
        <button onClick={() => setExpanded(v => !v)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 shrink-0">
          <ChevronRight size={14} className={cn('transition-transform duration-150', expanded && 'rotate-90')} />
        </button>
        {editingTitle ? (
          <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
            onBlur={saveTitle} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') saveTitle() }}
            className="flex-1 text-sm font-medium bg-transparent outline-none text-slate-900 dark:text-white" />
        ) : (
          <button onClick={() => setEditingTitle(true)}
            className="flex-1 text-left text-sm font-medium text-slate-900 dark:text-white hover:text-slate-700">
            {note.title || <span className="text-slate-400 italic">Untitled table</span>}
          </button>
        )}
        <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">
          {table.columns.length} col · {table.rows.length} rows
        </span>
        <button onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover/hdr:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* ── Expanded table ── */}
      {expanded && (
        <div className="border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="border-collapse text-sm w-full">
            <thead>
              <tr>
                {table.columns.map(col => (
                  <th key={col.id} className="group/col relative border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 min-w-[140px] text-left">
                    <div className="flex items-center gap-1.5 px-3 py-2">
                      {/* Type label — click to open type menu */}
                      <div className="relative shrink-0">
                        <button onClick={() => setTypeMenuCol(typeMenuCol === col.id ? null : col.id)}
                          className="text-xs text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 leading-none">
                          {COL_TYPES.find(t => t.id === col.type)?.label ?? 'Text'}
                        </button>
                        {typeMenuCol === col.id && (
                          <ColTypeMenu
                            col={col}
                            onChangeType={(type, options) => updateColType(col.id, type, options)}
                            onClose={() => setTypeMenuCol(null)}
                          />
                        )}
                      </div>
                      <input value={col.name} onChange={e => updateHeader(col.id, e.target.value)}
                        className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide bg-transparent outline-none min-w-0" />
                      {table.columns.length > 1 && (
                        <button onClick={() => deleteColumn(col.id)}
                          className="opacity-0 group-hover/col:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0">
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                {/* Add column */}
                <th className="border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 w-10">
                  <button onClick={addColumn}
                    className="w-full h-full flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-2 transition-colors">
                    <Plus size={13} />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map(row => (
                <tr key={row.id} className="group/row hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                  {table.columns.map(col => (
                    <td key={col.id} className="border-b border-r border-slate-200 dark:border-slate-700 px-3 py-1.5">
                      <Cell value={row.cells[col.id]} col={col} onChange={val => updateCell(row.id, col.id, val)} />
                    </td>
                  ))}
                  <td className="border-b border-slate-200 dark:border-slate-700 w-10">
                    <button onClick={() => deleteRow(row.id)}
                      className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center w-full py-1.5 text-slate-400 hover:text-red-500 transition-all">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2">
            <Plus size={12} /> Add row
          </button>
        </div>
      )}
    </div>
  )
}
