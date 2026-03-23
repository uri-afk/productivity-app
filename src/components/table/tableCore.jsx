import { useState, useRef, useEffect, useCallback } from 'react'
import { Check, Plus, X, Trash2, GripVertical } from 'lucide-react'
import { cn } from '../../lib/cn'

// ── Constants ────────────────────────────────────────────────────────
export const OPTION_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

export const COL_TYPES = [
  { id: 'text',        label: 'Text'         },
  { id: 'number',      label: 'Number'       },
  { id: 'date',        label: 'Date'         },
  { id: 'url',         label: 'URL'          },
  { id: 'checkbox',    label: 'Checkbox'     },
  { id: 'select',      label: 'Select'       },
  { id: 'multiselect', label: 'Multi-select' },
]

// ── Option helpers ───────────────────────────────────────────────────
export function normalizeOptions(options) {
  if (!Array.isArray(options)) return []
  return options.map((o, i) => {
    if (typeof o === 'string')
      return { id: `opt_${i}_${o}`, label: o, color: OPTION_COLORS[i % OPTION_COLORS.length] }
    return { id: o.id ?? `opt_${i}`, label: o.label ?? String(o), color: o.color ?? OPTION_COLORS[i % OPTION_COLORS.length] }
  })
}

// ── Table defaults ───────────────────────────────────────────────────
export function defaultTable() {
  return {
    columns: [
      { id: 'c0', name: 'Name',     type: 'text',   options: [] },
      { id: 'c1', name: 'Status',   type: 'select', options: [
        { id: 'o0', label: 'To Do',       color: '#6b7280' },
        { id: 'o1', label: 'In Progress', color: '#3b82f6' },
        { id: 'o2', label: 'Done',        color: '#22c55e' },
      ]},
      { id: 'c2', name: 'Due Date', type: 'date', options: [] },
    ],
    rows: [{ id: 'r0', cells: { c0: '', c1: '', c2: '' } }],
  }
}

export function parseTable(content) {
  try {
    const p = JSON.parse(content)
    if (!p) return defaultTable()
    if (p.columns?.[0]?.id) {
      return { ...p, columns: p.columns.map(c => ({ ...c, options: normalizeOptions(c.options ?? []) })) }
    }
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

// ── Color picker swatch grid ─────────────────────────────────────────
function ColorPicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 p-2">
      {OPTION_COLORS.map(color => (
        <button key={color} onClick={() => onChange(color)}
          className={cn('w-5 h-5 rounded-full transition-transform hover:scale-110 shrink-0',
            value === color && 'ring-2 ring-offset-1 ring-white dark:ring-slate-800 scale-110'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}

// ── Options editor ───────────────────────────────────────────────────
function OptionsEditor({ options, onChange }) {
  const [newLabel, setNewLabel] = useState('')
  const [colorPickerFor, setColorPickerFor] = useState(null)

  function addOption() {
    const label = newLabel.trim()
    if (!label) return
    const usedColors = options.map(o => o.color)
    const color = OPTION_COLORS.find(c => !usedColors.includes(c)) ?? OPTION_COLORS[options.length % OPTION_COLORS.length]
    onChange([...options, { id: `opt_${Date.now()}`, label, color }])
    setNewLabel('')
  }

  return (
    <div>
      {options.map(opt => (
        <div key={opt.id} className="flex items-center gap-2 py-1 group/opt">
          <div className="relative shrink-0">
            <button
              onClick={() => setColorPickerFor(colorPickerFor === opt.id ? null : opt.id)}
              className="w-4 h-4 rounded-full hover:scale-110 transition-transform shrink-0"
              style={{ backgroundColor: opt.color }}
            />
            {colorPickerFor === opt.id && (
              <div className="absolute left-0 top-full mt-1 z-[60] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl">
                <ColorPicker value={opt.color} onChange={c => {
                  onChange(options.map(o => o.id === opt.id ? { ...o, color: c } : o))
                  setColorPickerFor(null)
                }} />
              </div>
            )}
          </div>
          <input
            value={opt.label}
            onChange={e => onChange(options.map(o => o.id === opt.id ? { ...o, label: e.target.value } : o))}
            className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300 min-w-0"
          />
          <button onClick={() => onChange(options.filter(o => o.id !== opt.id))}
            className="opacity-0 group-hover/opt:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0">
            <X size={10} />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-1 mt-1.5 border-t border-slate-100 dark:border-slate-700 pt-1.5">
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption() } }}
          placeholder="Add option…"
          className="flex-1 text-xs bg-transparent outline-none text-slate-700 dark:text-slate-300 placeholder-slate-300 dark:placeholder-slate-600"
        />
        <button onClick={addOption} className="text-xs text-blue-600 dark:text-blue-400 font-medium shrink-0">Add</button>
      </div>
    </div>
  )
}

// ── Column type menu ─────────────────────────────────────────────────
function ColTypeMenu({ col, onChangeType, onClose }) {
  const ref = useRef(null)
  const opts = normalizeOptions(col.options ?? [])
  const needsOptions = col.type === 'select' || col.type === 'multiselect'

  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div ref={ref} className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[180px] max-h-[440px] overflow-y-auto">
      {COL_TYPES.map(t => (
        <button key={t.id}
          onClick={() => {
            const keepOpts = (t.id === 'select' || t.id === 'multiselect') ? opts : []
            onChangeType(t.id, keepOpts)
          }}
          className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2',
            col.type === t.id ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-slate-700 dark:text-slate-300')}>
          {col.type === t.id ? <Check size={10} /> : <span className="w-[10px]" />}
          {t.label}
        </button>
      ))}
      {needsOptions && (
        <div className="border-t border-slate-100 dark:border-slate-700 mt-1 px-3 pt-2 pb-3">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">Options</p>
          <OptionsEditor
            options={opts}
            onChange={newOpts => onChangeType(col.type, newOpts)}
          />
        </div>
      )}
    </div>
  )
}

// ── Cell ─────────────────────────────────────────────────────────────
function Cell({ value, col, onChange }) {
  const { type, options = [] } = col
  const opts = normalizeOptions(options)

  if (type === 'checkbox') {
    return (
      <div className="flex justify-center">
        <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 cursor-pointer accent-blue-600" />
      </div>
    )
  }

  if (type === 'select') {
    const selected = opts.find(o => o.label === value)
    return (
      <div className="relative min-h-[26px] flex items-center">
        <select value={value ?? ''} onChange={e => onChange(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
          <option value="">—</option>
          {opts.map(o => <option key={o.id} value={o.label}>{o.label}</option>)}
        </select>
        <div className="pointer-events-none">
          {selected
            ? <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ backgroundColor: selected.color + '20', color: selected.color }}>{selected.label}</span>
            : <span className="text-slate-400 dark:text-slate-500 text-xs">—</span>
          }
        </div>
      </div>
    )
  }

  if (type === 'multiselect') {
    const selected = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [])
    return (
      <div className="flex flex-wrap gap-1">
        {opts.map(o => {
          const on = selected.includes(o.label)
          return (
            <button key={o.id} type="button"
              onClick={() => onChange(on ? selected.filter(s => s !== o.label) : [...selected, o.label])}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium transition-all"
              style={on
                ? { backgroundColor: o.color + '20', color: o.color, border: `1px solid ${o.color}50` }
                : { backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #e2e8f0' }
              }>{o.label}</button>
          )
        })}
      </div>
    )
  }

  if (type === 'date') return <input type="date" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200" />
  if (type === 'number') return <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200 text-right" />
  return <input type={type === 'url' ? 'url' : 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full bg-transparent outline-none text-sm text-slate-800 dark:text-slate-200" />
}

// ── TableGrid ────────────────────────────────────────────────────────
// onChange(nextTable) is called for every mutation. Parent debounces saves.
export function TableGrid({ table, onChange }) {
  const [dragColIdx, setDragColIdx] = useState(null)
  const [dragOverColIdx, setDragOverColIdx] = useState(null)
  const [typeMenuCol, setTypeMenuCol] = useState(null)
  // Column widths: { [colId]: number } — local only, not persisted
  const [colWidths, setColWidths] = useState({})

  function updateCell(rowId, colId, val) {
    onChange({ ...table, rows: table.rows.map(r => r.id === rowId ? { ...r, cells: { ...r.cells, [colId]: val } } : r) })
  }
  function updateHeader(colId, val) {
    onChange({ ...table, columns: table.columns.map(c => c.id === colId ? { ...c, name: val } : c) })
  }
  function updateColType(colId, type, options) {
    onChange({ ...table, columns: table.columns.map(c => c.id === colId ? { ...c, type, options: options ?? [] } : c) })
    setTypeMenuCol(null)
  }
  function addRow() {
    onChange({ ...table, rows: [...table.rows, { id: `r${Date.now()}`, cells: Object.fromEntries(table.columns.map(c => [c.id, ''])) }] })
  }
  function addColumn() {
    const id = `c${Date.now()}`
    onChange({
      columns: [...table.columns, { id, name: `Column ${table.columns.length + 1}`, type: 'text', options: [] }],
      rows: table.rows.map(r => ({ ...r, cells: { ...r.cells, [id]: '' } })),
    })
  }
  function deleteRow(rowId) {
    onChange({ ...table, rows: table.rows.filter(r => r.id !== rowId) })
  }
  function deleteColumn(colId) {
    onChange({
      columns: table.columns.filter(c => c.id !== colId),
      rows: table.rows.map(r => { const cells = { ...r.cells }; delete cells[colId]; return { ...r, cells } }),
    })
  }
  function reorderCols(fromIdx, toIdx) {
    if (fromIdx === toIdx) return
    const cols = [...table.columns]
    const [moved] = cols.splice(fromIdx, 1)
    cols.splice(toIdx, 0, moved)
    onChange({ ...table, columns: cols })
  }

  // Column resize — document mousemove/mouseup (same pattern as panel resize)
  function startColResize(e, colId) {
    e.preventDefault()
    e.stopPropagation()
    const startX = e.clientX
    const startW = colWidths[colId] ?? 140

    function onMove(ev) {
      const newW = Math.max(72, startW + (ev.clientX - startX))
      setColWidths(prev => ({ ...prev, [colId]: newW }))
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr>
            {table.columns.map((col, ci) => (
              <th key={col.id}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColIdx(ci) }}
                onDrop={e => {
                  e.preventDefault()
                  reorderCols(Number(e.dataTransfer.getData('col-idx')), ci)
                  setDragColIdx(null); setDragOverColIdx(null)
                }}
                onDragEnd={() => { setDragColIdx(null); setDragOverColIdx(null) }}
                style={{ width: colWidths[col.id] ?? 140 }}
                className={cn(
                  'group/col relative border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-left select-none',
                  dragOverColIdx === ci && dragColIdx !== ci && 'border-l-2 border-l-blue-500'
                )}
              >
                <div className="flex items-center gap-1 px-2 py-2">
                  {/* Drag-to-reorder handle — only this element is draggable */}
                  <div
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('col-idx', String(ci))
                      setDragColIdx(ci)
                    }}
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 shrink-0 opacity-0 group-hover/col:opacity-100 transition-opacity"
                    title="Drag to reorder"
                  >
                    <GripVertical size={12} />
                  </div>

                  {/* Type selector */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setTypeMenuCol(typeMenuCol === col.id ? null : col.id)}
                      className="text-xs text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors border border-slate-200 dark:border-slate-600 rounded px-1 py-0.5 leading-none"
                    >
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

                  {/* Column name */}
                  <input
                    value={col.name}
                    onChange={e => updateHeader(col.id, e.target.value)}
                    className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide bg-transparent outline-none min-w-0 cursor-text"
                  />

                  {/* Delete column */}
                  {table.columns.length > 1 && (
                    <button
                      onClick={() => deleteColumn(col.id)}
                      className="opacity-0 group-hover/col:opacity-100 text-slate-400 hover:text-red-500 transition-all shrink-0"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>

                {/* Right-edge column resize handle */}
                <div
                  onMouseDown={e => startColResize(e, col.id)}
                  className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-blue-500/40 transition-colors z-10"
                />
              </th>
            ))}
            <th className="border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 w-10">
              <button onClick={addColumn} className="w-full h-full flex items-center justify-center text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 py-2 transition-colors">
                <Plus size={13} />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map(row => (
            <tr key={row.id} className="group/row hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              {table.columns.map(col => (
                <td key={col.id} className="border-b border-r border-slate-200 dark:border-slate-700 px-3 py-1.5 overflow-hidden">
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
      <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-3 py-2">
        <Plus size={12} /> Add row
      </button>
    </div>
  )
}
