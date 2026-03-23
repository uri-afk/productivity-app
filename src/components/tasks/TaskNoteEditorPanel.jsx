import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Bold, Italic, List, ListOrdered, Plus, X, Trash2 } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/ThemeContext'
import { COL_TYPES, defaultTable, parseTable, Cell, ColTypeMenu } from '../table/tableCore'

// ── Text editor toolbar button ────────────────────────────────────────
function ToolBtn({ onClick, active, title, children }) {
  return (
    <button type="button" title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={cn('p-1 rounded transition-colors',
        active ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white'
               : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      )}>
      {children}
    </button>
  )
}

// ── Table editor (inline within the panel) ────────────────────────────
function TableEditor({ note, onSave }) {
  const [table, setTable] = useState(() => parseTable(note.content))
  const [typeMenuCol, setTypeMenuCol] = useState(null)
  const saveTimeout = useRef(null)

  useEffect(() => {
    setTable(parseTable(note.content))
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function save(next) {
    setTable(next)
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => onSave({ ...note, content: JSON.stringify(next) }), 400)
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
    save({ ...table, rows: [...table.rows, { id: `r${Date.now()}`, cells: Object.fromEntries(table.columns.map(c => [c.id, ''])) }] })
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
    save({
      columns: table.columns.filter(c => c.id !== colId),
      rows: table.rows.map(r => { const cells = { ...r.cells }; delete cells[colId]; return { ...r, cells } }),
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm w-full">
        <thead>
          <tr>
            {table.columns.map(col => (
              <th key={col.id} className="group/col relative border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 min-w-[120px] text-left">
                <div className="flex items-center gap-1.5 px-2 py-1.5">
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
                    <button onClick={() => deleteColumn(col.id)} className="opacity-0 group-hover/col:opacity-100 text-slate-400 hover:text-red-500 shrink-0"><X size={11} /></button>
                  )}
                </div>
              </th>
            ))}
            <th className="border-b border-r border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 w-9">
              <button onClick={addColumn} className="w-full flex items-center justify-center text-slate-400 hover:text-blue-600 py-2 transition-colors"><Plus size={13} /></button>
            </th>
          </tr>
        </thead>
        <tbody>
          {table.rows.map(row => (
            <tr key={row.id} className="group/row hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              {table.columns.map(col => (
                <td key={col.id} className="border-b border-r border-slate-200 dark:border-slate-700 px-2 py-1.5">
                  <Cell value={row.cells[col.id]} col={col} onChange={val => updateCell(row.id, col.id, val)} />
                </td>
              ))}
              <td className="border-b border-slate-200 dark:border-slate-700 w-9">
                <button onClick={() => deleteRow(row.id)} className="opacity-0 group-hover/row:opacity-100 flex items-center justify-center w-full py-1.5 text-slate-400 hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors px-2 py-2">
        <Plus size={12} /> Add row
      </button>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────
export default function TaskNoteEditorPanel({ note, onBack, onSave }) {
  const { dark } = useTheme()
  const [title, setTitle] = useState(note.title ?? '')
  const [saved, setSaved] = useState(false)
  const titleTimeout = useRef(null)
  const bodyTimeout = useRef(null)
  const isTable = note.type === 'table'

  const editor = useEditor({
    extensions: [StarterKit],
    content: note.content ?? '',
    editorProps: { attributes: { class: 'outline-none min-h-[200px] prose prose-sm max-w-none text-sm' } },
    onUpdate: ({ editor }) => {
      setSaved(false)
      clearTimeout(bodyTimeout.current)
      bodyTimeout.current = setTimeout(() => {
        onSave({ ...note, title, content: editor.getHTML() })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }, 700)
    },
  })

  // Sync when switching notes
  useEffect(() => {
    if (!isTable) editor?.commands.setContent(note.content ?? '')
    setTitle(note.title ?? '')
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    setSaved(false)
    clearTimeout(titleTimeout.current)
    titleTimeout.current = setTimeout(() => {
      onSave({ ...note, title: val, content: isTable ? note.content : (editor?.getHTML() ?? note.content ?? '') })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }, 700)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onBack} />
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={15} /> Back to task
          </button>
          {saved && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
        </div>

        {/* Title */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <input value={title} onChange={handleTitleChange}
            onKeyDown={e => { if (e.key === 'Enter' && !isTable) { e.preventDefault(); setTimeout(() => editor?.view?.dom?.focus(), 0) } }}
            placeholder="Note title…"
            className="w-full text-base font-semibold text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-600" />
        </div>

        {isTable ? (
          /* Table body */
          <div className="flex-1 overflow-auto px-2 py-3">
            <TableEditor note={note} onSave={onSave} />
          </div>
        ) : (
          <>
            {/* Text toolbar */}
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold"><Bold size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><Italic size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list"><List size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list"><ListOrdered size={13} /></ToolBtn>
            </div>
            {/* Text body */}
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ color: dark ? 'rgb(248 250 252)' : 'rgb(15 23 42)' }}>
              <EditorContent editor={editor} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
