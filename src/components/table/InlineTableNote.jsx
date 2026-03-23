import { useState, useRef, useEffect } from 'react'
import { ChevronRight, Plus, X, Trash2, Check } from 'lucide-react'
import { cn } from '../../lib/cn'

// ── Column type definitions ──────────────────────────────────────────
const COL_TYPES = [
  { id: 'text',        label: 'Text'         },
  { id: 'number',      label: 'Number'       },
  { id: 'date',        label: 'Date'         },
  { id: 'url',         label: 'URL'          },
  { id: 'checkbox',    label: 'Checkbox'     },
  { id: 'select',      label: 'Select'       },
  { id: 'multiselect', label: 'Multi-select' },
]

// ── Parse stored content (handles old string-array format + new object format) ─
function parseTable(content) {
  try {
    const p = JSON.parse(content)
    if (!p) return defaultTable()
    // New format: columns are objects with id/name/type
    if (p.columns?.[0]?.id) return p
    // Old format: columns are strings, rows are arrays of arrays
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
      { id: 'c0', name: 'Name',     type: 'text',   options: [] },
      { id: 'c1', name: 'Status',   type: 'select', options: ['To Do', 'In Progress', 'Done'] },
      { id: 'c2', name: 'Due Date', type: 'date',   options: [] },
    ],
    rows: [{ id: 'r0', cells: { c0: '', c1: '', c2: '' } }],
  }
}

// ── Cell editor per type ─────────────────────────────────────────────
function Cell({ value, col, onChange }) {
  const { type, options = [] } = col

  if (type === 'checkbox') {
    return (
      <div className="flex justify-center">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
          className="w-4 h-4 cursor-pointer accent-blue-600" />
      </div>
    )
  }
  if (type === 'select') {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 cursor-pointer">
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
              selected.includes(o)
                ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300'
            )}
          >{o}</button>
        ))}
      </div>
    )
  }
  if (type === 'date') {
    return <input type="date" value={value ?? ''} onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200" />
  }
  if (type === 'number') {
    return <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 text-right" />
  }
  return <input type={type === 'url' ? 'url' : 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)}
    className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200" />
}

// ── Column type menu ─────────────────────────────────────────────────
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
    const opts = optionsInput.split(',').map(s => s.trim()).filter(Boolean)
    onChangeType(col.type, opts)
  }

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[160px]">
      {COL_TYPES.map(t => (
        <button key={t.id} onClick={() => onChangeType(t.id, col.options)}
          className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2',
            col.type === t.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
          {col.type === t.id && <Check size={10} />}
          <span className={col.type === t.id ? '' : 'ml-[14px]'}>{t.label}</span>
        </button>
      ))}
      {needsOptions && (
        <div className="border-t border-slate-100 dark:border-slate-700 mt-1 px-3 pt-2 pb-2">
          <p className="text-xs text-slate-400 mb-1">Options (comma-separated)</p>
          <input
            autoFocus
            value={optionsInput}
            onChange={e => setOptionsInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { applyOptions(); onClose() } }}
            placeholder="A, B, C"
            className="w-full text-xs bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-2 py-1 outline-none"
          />
          <button onClick={() => { applyOptions(); onClose() }}
            className="mt-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">Apply</button>
        </div>
      )}
    </div>
  )
}

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
