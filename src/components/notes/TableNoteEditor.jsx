import { useState, useEffect, useRef } from 'react'
import { X, Plus, Check, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { COL_TYPES, defaultTable, parseTable, Cell, ColTypeMenu } from '../table/tableCore'

export default function TableNoteEditor({ note, onClose, onUpdate }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [table, setTable] = useState(() => parseTable(note?.content))
  const [saved, setSaved] = useState(false)
  const [visible, setVisible] = useState(false)
  const [typeMenuCol, setTypeMenuCol] = useState(null)
  const titleTimeout = useRef(null)
  const tableTimeout = useRef(null)
  const savedTimer = useRef(null)

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

  function saveTable(next) {
    setTable(next)
    clearTimeout(tableTimeout.current)
    tableTimeout.current = setTimeout(() => { onUpdate(note.id, { content: JSON.stringify(next) }); markSaved() }, 400)
  }

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    clearTimeout(titleTimeout.current)
    titleTimeout.current = setTimeout(() => { if (val.trim()) { onUpdate(note.id, { title: val.trim() }); markSaved() } }, 700)
  }

  function updateCell(rowId, colId, val) {
    saveTable({ ...table, rows: table.rows.map(r => r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r) })
  }

  function updateHeader(colId, val) {
    saveTable({ ...table, columns: table.columns.map(c => c.id === colId ? { ...c, name: val } : c) })
  }

  function updateColType(colId, type, options) {
    saveTable({ ...table, columns: table.columns.map(c => c.id === colId ? { ...c, type, options: options ?? [] } : c) })
    setTypeMenuCol(null)
  }

  function addRow() {
    const cells = Object.fromEntries(table.columns.map(c => [c.id, '']))
    saveTable({ ...table, rows: [...table.rows, { id: `r${Date.now()}`, cells }] })
  }

  function addColumn() {
    const id = `c${Date.now()}`
    saveTable({
      columns: [...table.columns, { id, name: `Column ${table.columns.length + 1}`, type: 'text', options: [] }],
      rows: table.rows.map(r => ({ ...r, cells: { ...r.cells, [id]: '' } })),
    })
  }

  function deleteRow(ri) {
    saveTable({ ...table, rows: table.rows.filter(r => r.id !== ri) })
  }

  function deleteColumn(colId) {
    saveTable({
      columns: table.columns.filter(c => c.id !== colId),
      rows: table.rows.map(r => {
        const cells = { ...r.cells }
        delete cells[colId]
        return { ...r, cells }
      }),
    })
  }

  if (!note) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className={cn('absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300', visible ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <div className={cn('relative flex flex-col h-full w-full sm:w-2/3 lg:w-1/2 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl transition-transform duration-300 ease-out', visible ? 'translate-x-0' : 'translate-x-full')}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 h-11 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {saved ? <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400"><Check size={12} /> Saved</span> : <span />}
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
          <div className="inline-block min-w-full">
            <table className="border-collapse text-sm">
              <thead>
                <tr>
                  {table.columns.map(col => (
                    <th key={col.id} className="group/col relative border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 min-w-[140px] text-left">
                      <div className="flex items-center gap-1.5 px-3 py-2">
                        <div className="relative shrink-0">
                          <button onClick={() => setTypeMenuCol(typeMenuCol === col.id ? null : col.id)}
                            className="text-xs text-slate-400 hover:text-blue-500 transition-colors border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 leading-none">
                            {COL_TYPES.find(t => t.id === col.type)?.label ?? 'Text'}
                          </button>
                          {typeMenuCol === col.id && (
                            <ColTypeMenu col={col} onChangeType={(type, options) => updateColType(col.id, type, options)} onClose={() => setTypeMenuCol(null)} />
                          )}
                        </div>
                        <input value={col.name} onChange={e => updateHeader(col.id, e.target.value)}
                          className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide bg-transparent outline-none min-w-0" />
                        {table.columns.length > 1 && (
                          <button onClick={() => deleteColumn(col.id)} className="opacity-0 group-hover/col:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0"><X size={11} /></button>
                        )}
                      </div>
                    </th>
                  ))}
                  <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-9">
                    <button onClick={addColumn} className="w-full h-full flex items-center justify-center text-slate-400 hover:text-blue-600 py-2 transition-colors"><Plus size={13} /></button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map(row => (
                  <tr key={row.id} className="group/row">
                    {table.columns.map(col => (
                      <td key={col.id} className="border border-slate-200 dark:border-slate-700 px-3 py-1.5">
                        <Cell value={row.cells[col.id]} col={col} onChange={val => updateCell(row.id, col.id, val)} />
                      </td>
                    ))}
                    <td className="border border-transparent w-9">
                      <button onClick={() => deleteRow(row.id)} className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center w-full py-2 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={addRow} className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-1"><Plus size={12} /> Add row</button>
          </div>
        </div>
      </div>
    </div>
  )
}
