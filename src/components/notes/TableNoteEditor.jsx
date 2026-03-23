import { useState, useEffect, useRef } from 'react'
import { X, Plus, Check, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'

const COL_TYPES = [
  { id: 'text',        label: 'Text'         },
  { id: 'number',      label: 'Number'       },
  { id: 'date',        label: 'Date'         },
  { id: 'url',         label: 'URL'          },
  { id: 'checkbox',    label: 'Checkbox'     },
  { id: 'select',      label: 'Select'       },
  { id: 'multiselect', label: 'Multi-select' },
]

function parseTable(content) {
  try {
    const p = JSON.parse(content)
    if (!p) return defaultTable()
    if (p.columns?.[0]?.id) return p
    if (Array.isArray(p.columns)) {
      const columns = p.columns.map((name, i) => ({ id: `c${i}`, name, type: 'text', options: [] }))
      const rows = (p.rows ?? []).map((cells, i) => ({
        id: `r${i}`,
        cells: Object.fromEntries(columns.map((col, ci) => [col.id, cells[ci] ?? ''])),
      }))
      return { columns, rows }
    }
  } catch {}
  return defaultTable()
}

function defaultTable() {
  return {
    columns: [
      { id: 'c0', name: 'Column 1', type: 'text', options: [] },
      { id: 'c1', name: 'Column 2', type: 'text', options: [] },
      { id: 'c2', name: 'Column 3', type: 'text', options: [] },
    ],
    rows: [{ id: 'r0', cells: { c0: '', c1: '', c2: '' } }],
  }
}

function Cell({ value, col, onChange }) {
  const { type, options = [] } = col
  if (type === 'checkbox') {
    return <div className="flex justify-center"><input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 cursor-pointer accent-blue-600" /></div>
  }
  if (type === 'select') {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
        <option value="">—</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [])
    return (
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <button key={o} type="button"
            onClick={() => onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o])}
            className={cn('text-xs px-1.5 py-0.5 rounded border transition-colors',
              selected.includes(o) ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 text-blue-700 dark:text-blue-300' : 'border-slate-200 dark:border-slate-600 text-slate-500 hover:border-slate-300'
            )}>{o}</button>
        ))}
      </div>
    )
  }
  if (type === 'date') return <input type="date" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200" />
  if (type === 'number') return <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 text-right" />
  return <input type={type === 'url' ? 'url' : 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200" />
}

function ColTypeMenu({ col, onChangeType, onClose }) {
  const ref = useRef(null)
  const [optionsInput, setOptionsInput] = useState((col.options ?? []).join(', '))
  const needsOptions = col.type === 'select' || col.type === 'multiselect'

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  function applyOptions() {
    onChangeType(col.type, optionsInput.split(',').map(s => s.trim()).filter(Boolean))
  }

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[160px]">
      {COL_TYPES.map(t => (
        <button key={t.id} onClick={() => onChangeType(t.id, col.options)}
          className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2',
            col.type === t.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
          {col.type === t.id ? <Check size={10} /> : <span className="w-[10px]" />}
          {t.label}
        </button>
      ))}
      {needsOptions && (
        <div className="border-t border-slate-100 dark:border-slate-700 mt-1 px-3 pt-2 pb-2">
          <p className="text-xs text-slate-400 mb-1">Options (comma-separated)</p>
          <input autoFocus value={optionsInput} onChange={e => setOptionsInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { applyOptions(); onClose() } }}
            placeholder="A, B, C"
            className="w-full text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 outline-none" />
          <button onClick={() => { applyOptions(); onClose() }} className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">Apply</button>
        </div>
      )}
    </div>
  )
}

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
