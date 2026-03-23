// Shared table editing primitives used by InlineTableNote, TableNoteEditor, TaskNoteEditorPanel
import { useState, useRef, useEffect } from 'react'
import { Check } from 'lucide-react'
import { cn } from '../../lib/cn'

export const COL_TYPES = [
  { id: 'text',        label: 'Text'         },
  { id: 'number',      label: 'Number'       },
  { id: 'date',        label: 'Date'         },
  { id: 'url',         label: 'URL'          },
  { id: 'checkbox',    label: 'Checkbox'     },
  { id: 'select',      label: 'Select'       },
  { id: 'multiselect', label: 'Multi-select' },
]

export function defaultTable() {
  return {
    columns: [
      { id: 'c0', name: 'Name',     type: 'text',   options: [] },
      { id: 'c1', name: 'Status',   type: 'select', options: ['To Do', 'In Progress', 'Done'] },
      { id: 'c2', name: 'Due Date', type: 'date',   options: [] },
    ],
    rows: [{ id: 'r0', cells: { c0: '', c1: '', c2: '' } }],
  }
}

export function parseTable(content) {
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

export function Cell({ value, col, onChange }) {
  const { type, options = [] } = col
  if (type === 'checkbox') {
    return (
      <div className="flex justify-center">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 cursor-pointer accent-blue-600" />
      </div>
    )
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

export function ColTypeMenu({ col, onChangeType, onClose }) {
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
