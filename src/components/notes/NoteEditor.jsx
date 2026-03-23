import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, Color, FontSize as TiptapFontSize } from '@tiptap/extension-text-style'
import {
  X, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Minus, Check, ChevronDown, LayoutGrid, Trash2, GripVertical,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/ThemeContext'
import { useResizable } from '../../hooks/useResizable'
import { TableGrid, defaultTable } from '../table/tableCore'


// ─── Preset palettes ──────────────────────────────────────────────
const FONT_SIZES = [
  { label: 'Small',  value: '12px' },
  { label: 'Normal', value: null   },
  { label: 'Large',  value: '18px' },
  { label: 'Huge',   value: '24px' },
]

const COLORS = [
  { label: 'Default', value: null,      swatch: null      },
  { label: 'White',   value: '#ffffff', swatch: '#ffffff' },
  { label: 'Gray',    value: '#6b7280', swatch: '#6b7280' },
  { label: 'Red',     value: '#ef4444', swatch: '#ef4444' },
  { label: 'Orange',  value: '#f97316', swatch: '#f97316' },
  { label: 'Amber',   value: '#f59e0b', swatch: '#f59e0b' },
  { label: 'Green',   value: '#22c55e', swatch: '#22c55e' },
  { label: 'Blue',    value: '#3b82f6', swatch: '#3b82f6' },
  { label: 'Purple',  value: '#a855f7', swatch: '#a855f7' },
  { label: 'Pink',    value: '#ec4899', swatch: '#ec4899' },
]

// ─── Toolbar helpers ──────────────────────────────────────────────
function Divider() {
  return <span className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1 shrink-0" />
}

function ToolBtn({ onClick, active, title, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={cn(
        'p-1.5 rounded transition-colors shrink-0',
        active
          ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  )
}

function Dropdown({ label, children }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onMouseDown={e => { e.preventDefault(); setOpen(v => !v) }}
        className="flex items-center gap-0.5 px-1.5 py-1 rounded text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        {label} <ChevronDown size={11} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-max">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

// ─── Saved indicator ──────────────────────────────────────────────
function SavedIndicator({ status }) {
  if (status === 'idle') return null
  return (
    <span className={cn(
      'flex items-center gap-1 text-xs transition-opacity',
      status === 'saved' ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
    )}>
      {status === 'saved' ? <><Check size={12} /> Saved</> : 'Saving…'}
    </span>
  )
}

// ─── Content serialization ────────────────────────────────────────
function parseNoteContent(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.html === 'string') {
      return { html: parsed.html, tables: Array.isArray(parsed.tables) ? parsed.tables : [] }
    }
  } catch {}
  return { html: raw ?? '', tables: [] }
}

function serializeNoteContent(html, tables) {
  if (!tables.length) return html
  return JSON.stringify({ html, tables })
}

// ─── Main component ───────────────────────────────────────────────
export default function NoteEditor({ note, onClose, onUpdate }) {
  const { dark } = useTheme()
  const { width, startResize } = useResizable({ defaultWidth: 600, minWidth: 360, maxWidth: 1100 })
  const [title, setTitle] = useState(note?.title ?? '')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [visible, setVisible] = useState(false)
  const [embeddedTables, setEmbeddedTables] = useState(() => parseNoteContent(note?.content).tables)
  const [tableHeights, setTableHeights] = useState({})
  const [dragTableIdx, setDragTableIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const titleTimeout = useRef(null)
  const bodyTimeout = useRef(null)
  const savedTimer = useRef(null)
  const editorWrapperRef = useRef(null)
  const tableContentRefs = useRef({})
  // Ref so TipTap's debounced onUpdate always sees the latest tables
  const embeddedTablesRef = useRef(embeddedTables)
  useEffect(() => { embeddedTablesRef.current = embeddedTables }, [embeddedTables])

  function focusEditor() {
    setTimeout(() => { editor?.view?.dom?.focus() }, 0)
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function markSaved() {
    setSaveStatus('saved')
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }

  function saveContent(html, tables) {
    onUpdate(note.id, { content: serializeNoteContent(html, tables) })
    markSaved()
  }

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color, TiptapFontSize],
    content: parseNoteContent(note?.content).html,
    editorProps: {
      attributes: { class: 'outline-none min-h-64 prose max-w-none note-editor-prose' },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('saving')
      clearTimeout(bodyTimeout.current)
      bodyTimeout.current = setTimeout(() => {
        saveContent(editor.getHTML(), embeddedTablesRef.current)
      }, 700)
    },
  })

  useEffect(() => {
    if (!note) return
    const { html, tables } = parseNoteContent(note.content)
    setTitle(note.title)
    editor?.commands.setContent(html)
    setEmbeddedTables(tables)
    setTableHeights({})
    setSaveStatus('idle')
  }, [note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    setSaveStatus('saving')
    clearTimeout(titleTimeout.current)
    titleTimeout.current = setTimeout(() => {
      if (val.trim()) { onUpdate(note.id, { title: val.trim() }); markSaved() }
    }, 700)
  }

  // ── Embedded table handlers ──────────────────────────────────────
  function insertTable() {
    const next = [...embeddedTables, { id: `t_${Date.now()}`, name: 'Table', data: defaultTable() }]
    setEmbeddedTables(next)
    saveContent(editor?.getHTML() ?? '', next)
  }

  function updateTable(tableId, nextData) {
    const next = embeddedTables.map(t => t.id === tableId ? { ...t, data: nextData } : t)
    setEmbeddedTables(next)
    setSaveStatus('saving')
    clearTimeout(bodyTimeout.current)
    bodyTimeout.current = setTimeout(() => saveContent(editor?.getHTML() ?? '', next), 700)
  }

  function deleteTable(tableId) {
    const next = embeddedTables.filter(t => t.id !== tableId)
    setEmbeddedTables(next)
    saveContent(editor?.getHTML() ?? '', next)
  }

  function updateTableName(tableId, name) {
    const next = embeddedTables.map(t => t.id === tableId ? { ...t, name } : t)
    setEmbeddedTables(next)
    saveContent(editor?.getHTML() ?? '', next)
  }

  // ── Table vertical resize (pointer capture) ──────────────────────
  function startTableResize(e, tableId) {
    e.preventDefault()
    const handle = e.currentTarget
    const contentEl = tableContentRefs.current[tableId]
    const startY = e.clientY
    const startH = tableHeights[tableId] ?? contentEl?.offsetHeight ?? 200
    handle.setPointerCapture(e.pointerId)
    let finalH = startH
    function onMove(ev) {
      finalH = Math.max(80, startH + (ev.clientY - startY))
      setTableHeights(prev => ({ ...prev, [tableId]: finalH }))
    }
    function onUp() {
      handle.removeEventListener('pointermove', onMove)
      handle.removeEventListener('pointerup', onUp)
    }
    handle.addEventListener('pointermove', onMove)
    handle.addEventListener('pointerup', onUp)
  }

  // ── Table drag-to-reorder ────────────────────────────────────────
  function handleTableDrop(e, toIdx) {
    e.preventDefault()
    if (dragTableIdx === null || dragTableIdx === toIdx) return
    const next = [...embeddedTables]
    const [moved] = next.splice(dragTableIdx, 1)
    next.splice(toIdx, 0, moved)
    setEmbeddedTables(next)
    saveContent(editor?.getHTML() ?? '', next)
    setDragTableIdx(null)
    setDragOverIdx(null)
  }

  if (!note) return null

  const activeColor = editor?.getAttributes('textStyle')?.color ?? null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Heading size overrides — prose-sm can render h1 < h2 in some Tailwind v4 configs */}
      <style>{`
        .note-editor-prose h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.25; margin: 1rem 0 0.5rem; }
        .note-editor-prose h2 { font-size: 1.5rem;   font-weight: 600; line-height: 1.3;  margin: 0.875rem 0 0.5rem; }
        .note-editor-prose h3 { font-size: 1.25rem;  font-weight: 600; line-height: 1.4;  margin: 0.75rem 0 0.5rem; }
      `}</style>

      {/* Dimmed backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
          visible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        className={cn(
          'relative flex flex-col h-full bg-white dark:bg-slate-900',
          'border-l border-slate-200 dark:border-slate-800 shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
        style={{ width }}
      >
        {/* Resize handle */}
        <div onMouseDown={startResize}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10" />

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 h-11 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <SavedIndicator status={saveStatus} />
          <button onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={17} />
          </button>
        </div>

        {/* ── Title ── */}
        <div className="px-6 pt-6 pb-4 border-b-2 border-slate-100 dark:border-slate-800 shrink-0">
          <input
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title…"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); focusEditor() } }}
            className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-600 leading-tight"
          />
        </div>

        {/* ── Formatting toolbar ── */}
        <div className="flex items-center flex-wrap gap-0.5 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
          <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold (⌘B)">
            <Bold size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic (⌘I)">
            <Italic size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive('underline')} title="Underline (⌘U)">
            <UnderlineIcon size={14} />
          </ToolBtn>

          <Divider />

          {[1, 2, 3].map(level => (
            <ToolBtn key={level}
              onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
              active={editor?.isActive('heading', { level })}
              title={`Heading ${level}`}>
              <span className="text-xs font-bold leading-none">H{level}</span>
            </ToolBtn>
          ))}

          <Divider />

          <Dropdown label="Aa">
            {close => FONT_SIZES.map(({ label, value }) => (
              <button key={label} type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  if (value) editor?.chain().focus().setFontSize(value).run()
                  else editor?.chain().focus().unsetFontSize().run()
                  close()
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap">
                <span style={value ? { fontSize: value } : {}}>{label}</span>
              </button>
            ))}
          </Dropdown>

          <Dropdown label={
            <span className="flex items-center gap-1">
              <span className="font-bold text-xs" style={{ color: activeColor ?? 'currentColor' }}>A</span>
              <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: activeColor ?? '#6b7280' }} />
            </span>
          }>
            {close => (
              <div className="px-3 py-2 grid grid-cols-5 gap-1.5">
                {COLORS.map(({ label, value, swatch }) => (
                  <button key={label} type="button" title={label}
                    onMouseDown={e => {
                      e.preventDefault()
                      if (value) editor?.chain().focus().setColor(value).run()
                      else editor?.chain().focus().unsetColor().run()
                      close()
                    }}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center',
                      activeColor === value ? 'border-blue-500' : 'border-slate-200 dark:border-slate-600'
                    )}
                    style={swatch ? { backgroundColor: swatch } : {}}>
                    {!swatch && <span className="text-slate-400 text-xs leading-none">↺</span>}
                  </button>
                ))}
              </div>
            )}
          </Dropdown>

          <Divider />

          <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
            <List size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
            <ListOrdered size={14} />
          </ToolBtn>

          <Divider />

          <ToolBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider line">
            <Minus size={14} />
          </ToolBtn>

          <Divider />

          <ToolBtn onClick={insertTable} title="Insert table">
            <LayoutGrid size={14} />
          </ToolBtn>
        </div>

        {/* ── Editor body ── */}
        <div ref={editorWrapperRef}
          className="flex-1 overflow-y-auto px-6 py-5"
          style={{ color: dark ? 'rgb(248 250 252)' : 'rgb(15 23 42)' }}>

          <EditorContent editor={editor} />

          {/* Embedded tables */}
          {embeddedTables.map((t, idx) => (
            <div key={t.id}
              className={cn(
                'mt-6 border rounded-xl overflow-hidden transition-colors',
                dragOverIdx === idx && dragTableIdx !== idx
                  ? 'border-blue-500 border-2'
                  : 'border-slate-200 dark:border-slate-700',
                dragTableIdx === idx && 'opacity-40'
              )}
              onDragOver={e => { e.preventDefault(); setDragOverIdx(idx) }}
              onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverIdx(null) }}
              onDrop={e => handleTableDrop(e, idx)}
            >
              {/* Table header bar — draggable */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing select-none"
                draggable
                onDragStart={e => {
                  setDragTableIdx(idx)
                  e.dataTransfer.effectAllowed = 'move'
                  e.dataTransfer.setData('text/plain', String(idx))
                }}
                onDragEnd={() => { setDragTableIdx(null); setDragOverIdx(null) }}
              >
                <GripVertical size={14} className="text-slate-400 shrink-0" />
                <input
                  value={t.name}
                  onChange={e => updateTableName(t.id, e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onMouseDown={e => e.stopPropagation()}
                  className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-transparent outline-none min-w-0 cursor-text"
                  placeholder="Table name…"
                />
                <button onClick={() => deleteTable(t.id)}
                  onMouseDown={e => e.stopPropagation()}
                  className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                  title="Delete table">
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Table content — height-constrained when resized */}
              <div
                ref={el => { if (el) tableContentRefs.current[t.id] = el }}
                style={tableHeights[t.id] ? { height: tableHeights[t.id], overflowY: 'auto' } : {}}
              >
                <TableGrid table={t.data} onChange={nextData => updateTable(t.id, nextData)} />
              </div>

              {/* Bottom resize handle */}
              <div
                className="h-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-row-resize flex items-center justify-center group/btm touch-none"
                onPointerDown={e => startTableResize(e, t.id)}
              >
                <div className="w-10 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full group-hover/btm:bg-blue-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
