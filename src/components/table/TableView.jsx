import { useMemo, useCallback, useState, useRef, forwardRef, useImperativeHandle, useEffect } from 'react'
import { AgGridReact } from 'ag-grid-react'
import { themeQuartz, colorSchemeDark } from 'ag-grid-community'
import { Plus, X, Trash2, ExternalLink } from 'lucide-react'
import { useTableData } from '../../hooks/useTableData'
import { useTheme } from '../../lib/ThemeContext'
import { cn } from '../../lib/cn'
import AddColumnModal from './AddColumnModal'

// ── Status/Priority badge colors ────────────────────────────────────
const BADGE_COLORS = {
  'To Do':       'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
  'In Progress': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'Done':        'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'High':        'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  'Medium':      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'Low':         'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
}

// ── Custom cell renderers ────────────────────────────────────────────
function BadgeRenderer({ value }) {
  if (!value) return null
  const cls = BADGE_COLORS[value] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
  return <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', cls)}>{value}</span>
}

function TagsRenderer({ value }) {
  if (!value) return null
  const tags = Array.isArray(value) ? value : String(value).split(',').map(s => s.trim()).filter(Boolean)
  return (
    <div className="flex flex-wrap gap-1 items-center h-full">
      {tags.map(t => (
        <span key={t} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{t}</span>
      ))}
    </div>
  )
}

function UrlRenderer({ value }) {
  if (!value) return null
  return (
    <a href={value} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline text-xs">
      <ExternalLink size={11} />
      {value}
    </a>
  )
}

function CheckboxRenderer({ value, node, colDef, context }) {
  return (
    <input type="checkbox" checked={!!value} onChange={e => {
      node.setDataValue(colDef.field, e.target.checked)
      context?.onCellChange?.(node.data._id, colDef.field, e.target.checked)
    }} className="w-4 h-4 cursor-pointer" />
  )
}

// ── Select cell editor ────────────────────────────────────────────────
const SelectCellEditor = forwardRef(function SelectCellEditor({ value, options = [], stopEditing }, ref) {
  const [val, setVal] = useState(value ?? '')
  useImperativeHandle(ref, () => ({ getValue: () => val }))

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] z-50">
      {options.map(opt => (
        <button
          key={opt}
          className={cn(
            'w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2',
            val === opt ? 'font-medium text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'
          )}
          onMouseDown={e => { e.preventDefault(); setVal(opt); stopEditing() }}
        >
          <span className={cn('w-2 h-2 rounded-full', val === opt ? 'bg-blue-500' : 'bg-transparent')} />
          {opt}
        </button>
      ))}
      {val && (
        <button className="w-full text-left px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          onMouseDown={e => { e.preventDefault(); setVal(''); stopEditing() }}>Clear</button>
      )}
    </div>
  )
})

// ── MultiSelect cell editor ───────────────────────────────────────────
const MultiSelectCellEditor = forwardRef(function MultiSelectCellEditor({ value, options = [], stopEditing }, ref) {
  const raw = Array.isArray(value) ? value : (value ? String(value).split(',').map(s => s.trim()).filter(Boolean) : [])
  const [selected, setSelected] = useState(raw)
  useImperativeHandle(ref, () => ({ getValue: () => selected.length ? selected : null }))

  function toggle(opt) {
    setSelected(prev => prev.includes(opt) ? prev.filter(o => o !== opt) : [...prev, opt])
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] z-50">
      {options.map(opt => (
        <button key={opt}
          className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300"
          onMouseDown={e => { e.preventDefault(); toggle(opt) }}>
          <span className={cn('w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
            selected.includes(opt) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-600')}>
            {selected.includes(opt) && <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
          </span>
          {opt}
        </button>
      ))}
      <div className="border-t border-slate-100 dark:border-slate-700 mt-1 pt-1 px-3">
        <button className="text-xs text-blue-600 dark:text-blue-400 py-1" onMouseDown={e => { e.preventDefault(); stopEditing() }}>Done</button>
      </div>
    </div>
  )
})

// ── Custom column header ─────────────────────────────────────────────
function ColHeader({ displayName, column, context }) {
  const colId = column.getColId()
  const isName = context?.nameColId === colId
  const isAdd = colId === '__add__'

  if (isAdd) {
    return (
      <button onClick={() => context?.onAddColumn?.()} className="flex items-center justify-center w-full h-full text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
        <Plus size={14} />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-1 w-full group/hdr">
      <span className="flex-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{displayName}</span>
      {!isName && (
        <button
          onClick={e => { e.stopPropagation(); context?.onDeleteColumn?.(colId) }}
          className="opacity-0 group-hover/hdr:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all"
        >
          <X size={11} />
        </button>
      )}
    </div>
  )
}

// ── Main TableView ────────────────────────────────────────────────────
export default function TableView({ projectId, onSelectRow }) {
  const { dark } = useTheme()
  const { columns, rows, loading, createColumn, deleteColumn, reorderColumns, createRow, updateRow, deleteRow } = useTableData(projectId)
  const [addingColumn, setAddingColumn] = useState(false)
  const [contextMenu, setContextMenu] = useState(null) // { x, y, rowId }
  const gridRef = useRef(null)
  const menuRef = useRef(null)

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return
    const handler = e => { if (!menuRef.current?.contains(e.target)) setContextMenu(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [contextMenu])

  const nameColId = columns[0]?.id

  // AG Grid theme — v33+ themeQuartz approach
  const gridTheme = useMemo(
    () => dark ? themeQuartz.withPart(colorSchemeDark) : themeQuartz,
    [dark]
  )

  // Build AG Grid column definitions
  const colDefs = useMemo(() => {
    const defs = columns.map(col => {
      const base = {
        field: col.id,
        headerName: col.name,
        headerComponent: ColHeader,
        editable: true,
        resizable: true,
        minWidth: 120,
        flex: col.type === 'text' && col.col_order === 0 ? 2 : 1,
      }

      if (col.type === 'select') {
        return { ...base, cellRenderer: BadgeRenderer, cellEditor: SelectCellEditor, cellEditorPopup: true,
          cellEditorParams: { options: col.options ?? [] }, singleClickEdit: true }
      }
      if (col.type === 'multiselect') {
        return { ...base, cellRenderer: TagsRenderer, cellEditor: MultiSelectCellEditor, cellEditorPopup: true,
          cellEditorParams: { options: col.options ?? [] }, singleClickEdit: true }
      }
      if (col.type === 'date') {
        return { ...base, cellEditor: 'agDateStringCellEditor', singleClickEdit: true }
      }
      if (col.type === 'number') {
        return { ...base, type: 'numericColumn', cellEditor: 'agNumberCellEditor', singleClickEdit: true }
      }
      if (col.type === 'url') {
        return { ...base, cellRenderer: UrlRenderer, singleClickEdit: true }
      }
      if (col.type === 'checkbox') {
        return { ...base, cellRenderer: CheckboxRenderer, editable: false, singleClickEdit: false }
      }
      // default text
      return { ...base, singleClickEdit: true }
    })

    // "+" add column button as last header
    defs.push({
      field: '__add__',
      headerName: '',
      headerComponent: ColHeader,
      editable: false,
      resizable: false,
      suppressMovable: true,
      width: 48,
      maxWidth: 48,
      cellRenderer: () => null,
      suppressNavigable: true,
    })

    return defs
  }, [columns])

  const rowData = useMemo(() => rows.map(r => ({ _id: r.id, ...r.data })), [rows])

  const context = useMemo(() => ({
    nameColId,
    onAddColumn: () => setAddingColumn(true),
    onDeleteColumn: (colId) => {
      if (!window.confirm('Delete this column and all its data?')) return
      deleteColumn(colId)
    },
    onCellChange: (rowId, field, value) => {
      updateRow(rowId, { [field]: value })
    },
  }), [nameColId, deleteColumn, updateRow])

  const onCellValueChanged = useCallback(params => {
    if (params.column.getColId() === '__add__') return
    updateRow(params.data._id, { [params.column.getColId()]: params.newValue })
  }, [updateRow])

  const onCellContextMenu = useCallback(params => {
    params.event.preventDefault()
    if (params.data?._id) {
      setContextMenu({ x: params.event.clientX, y: params.event.clientY, rowId: params.data._id })
    }
  }, [])

  const onRowClicked = useCallback(params => {
    if (params.column?.getColId() === '__add__') return
    if (params.column?.getColId() === nameColId) {
      const row = rows.find(r => r.id === params.data._id)
      onSelectRow?.(row)
    }
  }, [rows, nameColId, onSelectRow])

  const onColumnMoved = useCallback(params => {
    const allCols = params.api.getColumnState()
    const reordered = allCols
      .filter(c => c.colId !== '__add__')
      .map((c) => columns.find(col => col.id === c.colId))
      .filter(Boolean)
      .map((col, i) => ({ ...col, col_order: i }))
    reorderColumns(reordered)
  }, [columns, reorderColumns])

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-8 rounded bg-slate-200 dark:bg-slate-700" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
        style={{ height: Math.max(300, Math.min(600, 48 + rows.length * 42 + 48)) }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rowData}
          columnDefs={colDefs}
          context={context}
          theme={gridTheme}
          onCellValueChanged={onCellValueChanged}
          onCellContextMenu={onCellContextMenu}
          onRowClicked={onRowClicked}
          onColumnMoved={onColumnMoved}
          rowHeight={42}
          headerHeight={40}
          suppressRowClickSelection
          enableCellTextSelection
          stopEditingWhenCellsLoseFocus
        />
      </div>

      {/* Add row */}
      <button
        onClick={createRow}
        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors w-fit"
      >
        <Plus size={14} /> Add row
      </button>

      {/* Add column modal */}
      {addingColumn && <AddColumnModal onClose={() => setAddingColumn(false)} onCreate={createColumn} />}

      {/* Row context menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 9999 }}
          className="w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1"
        >
          <button
            onClick={() => { deleteRow(contextMenu.rowId); setContextMenu(null) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 size={13} /> Delete row
          </button>
        </div>
      )}
    </div>
  )
}
