import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, Color, FontSize as TiptapFontSize } from '@tiptap/extension-text-style'
import {
  X, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Minus, Check, ChevronDown, LayoutGrid, Trash2, GripVertical,
  Copy, Scissors, ClipboardPaste,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/ThemeContext'
import { useResizable } from '../../hooks/useResizable'
import { TableGrid, defaultTable } from '../table/tableCore'
import { tableClipboard } from '../../lib/tableClipboard'


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

// ─── Content migration ────────────────────────────────────────────
// Old format: { html, tables: [...] }  →  new format: plain HTML with embedded table nodes
function migrateContent(raw) {
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.html === 'string') {
      let html = parsed.html || ''
      const tables = Array.isArray(parsed.tables) ? parsed.tables : []
      tables.forEach(t => {
        const safeData = JSON.stringify(t.data).replace(/"/g, '&quot;')
        const safeName = (t.name || 'Table').replace(/"/g, '&quot;')
        html += `<div data-type="embedded-table" data-id="${t.id}" data-name="${safeName}" data-table="${safeData}"></div>`
      })
      return html
    }
  } catch {}
  return raw || ''
}

// ─── TableNodeView ────────────────────────────────────────────────
// Rendered by TipTap whenever an embeddedTable node appears in the doc.
// Tables live inline with text — cursor can be placed before/after them.
function TableNodeView({ node, updateAttributes, deleteNode }) {
  const { id, name: initialName } = node.attrs
  const [tableName, setTableName] = useState(initialName || 'Table')
  const [height, setHeight] = useState(null)
  const nameTimeout = useRef(null)
  const contentRef = useRef(null)

  const tableData = node.attrs.tableData || defaultTable()

  function handleNameChange(val) {
    setTableName(val)
    clearTimeout(nameTimeout.current)
    nameTimeout.current = setTimeout(() => updateAttributes({ name: val }), 400)
  }

  function buildClipboardFormats(data) {
    const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    const cellVal = v => Array.isArray(v) ? v.join(', ') : String(v ?? '')
    const headers = data.columns.map(c => `<th style="border:1px solid #ccc;padding:4px 8px;background:#f5f5f5">${esc(c.name)}</th>`).join('')
    const rows = data.rows.map(r =>
      `<tr>${data.columns.map(c => `<td style="border:1px solid #ccc;padding:4px 8px">${esc(cellVal(r.cells[c.id]))}</td>`).join('')}</tr>`
    ).join('')
    const html = `<table style="border-collapse:collapse"><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`
    const tsv = [
      data.columns.map(c => c.name).join('\t'),
      ...data.rows.map(r => data.columns.map(c => cellVal(r.cells[c.id])).join('\t')),
    ].join('\n')
    return { html, tsv }
  }

  function handleCopy() {
    tableClipboard.copy({ id, name: tableName, data: tableData })
    const { html, tsv } = buildClipboardFormats(tableData)
    navigator.clipboard.write([
      new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([tsv], { type: 'text/plain' }),
      })
    ]).catch(() => navigator.clipboard.writeText(tsv).catch(() => {}))
  }

  function handleCut() {
    handleCopy()
    deleteNode()
  }

  function startResize(e) {
    e.preventDefault()
    const startY = e.clientY
    const startH = height ?? contentRef.current?.offsetHeight ?? 200
    let finalH = startH
    function onMove(ev) {
      finalH = Math.max(80, startH + (ev.clientY - startY))
      setHeight(finalH)
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  return (
    <NodeViewWrapper className="my-4" contentEditable={false}>
      <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {/* Header — data-drag-handle lets TipTap drag this node */}
        <div
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 select-none"
          data-drag-handle
        >
          <GripVertical size={14} className="text-slate-400 cursor-grab shrink-0" />
          <input
            value={tableName}
            onChange={e => handleNameChange(e.target.value)}
            onMouseDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            className="flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-transparent outline-none min-w-0 cursor-text"
            placeholder="Table name…"
          />
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors shrink-0"
            title="Copy table (also copies as HTML for Notes/Word/Pages)">
            <Copy size={13} />
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={handleCut}
            className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors shrink-0"
            title="Cut table">
            <Scissors size={13} />
          </button>
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={deleteNode}
            className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
            title="Delete table">
            <Trash2 size={13} />
          </button>
        </div>

        {/* Table content */}
        <div
          ref={contentRef}
          style={height ? { height, overflowY: 'auto' } : {}}
        >
          <TableGrid
            table={tableData}
            onChange={newData => updateAttributes({ tableData: newData })}
          />
        </div>

        {/* Bottom resize handle */}
        <div
          className="h-2.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-blue-100 dark:hover:bg-blue-900/30 cursor-row-resize flex items-center justify-center group/btm"
          onMouseDown={startResize}
        >
          <div className="w-10 h-0.5 bg-slate-300 dark:bg-slate-600 rounded-full group-hover/btm:bg-blue-400 transition-colors" />
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// ─── TipTap extension ─────────────────────────────────────────────
const EmbeddedTable = Node.create({
  name: 'embeddedTable',
  group: 'block',
  atom: true,      // treated as a single unit; cursor can be placed before/after
  draggable: true, // allows TipTap drag-to-reorder

  addAttributes() {
    return {
      id:        { default: null },
      name:      { default: 'Table' },
      tableData: {
        default: null,
        parseHTML: el => {
          try { return JSON.parse(el.getAttribute('data-table') || 'null') } catch { return null }
        },
        renderHTML: attrs => ({ 'data-table': JSON.stringify(attrs.tableData) }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embedded-table"]' }]
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['div', mergeAttributes(HTMLAttributes, {
      'data-type': 'embedded-table',
      'data-id':   node.attrs.id,
      'data-name': node.attrs.name,
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(TableNodeView)
  },
})

// ─── Main component ───────────────────────────────────────────────
export default function NoteEditor({ note, onClose, onUpdate, inline = false }) {
  const { dark } = useTheme()
  const { width, startResize } = useResizable({ defaultWidth: 600, minWidth: 360, maxWidth: 1100 })
  const [title, setTitle] = useState(note?.title ?? '')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [visible, setVisible] = useState(false)
  const [clipboardHasTable, setClipboardHasTable] = useState(() => tableClipboard.has())
  const titleTimeout = useRef(null)
  const bodyTimeout = useRef(null)
  const savedTimer = useRef(null)

  // Subscribe to clipboard changes (triggered from TableNodeView.handleCopy)
  useEffect(() => tableClipboard.subscribe(setClipboardHasTable), [])

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

  function saveContent(html) {
    onUpdate(note.id, { content: html })
    markSaved()
  }

  const editor = useEditor({
    extensions: [StarterKit, Underline, TextStyle, Color, TiptapFontSize, EmbeddedTable],
    content: migrateContent(note?.content),
    editorProps: {
      attributes: { class: 'outline-none min-h-64 prose max-w-none note-editor-prose' },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('saving')
      clearTimeout(bodyTimeout.current)
      bodyTimeout.current = setTimeout(() => {
        saveContent(editor.getHTML())
      }, 700)
    },
  })

  useEffect(() => {
    if (!note) return
    setTitle(note.title)
    editor?.commands.setContent(migrateContent(note.content))
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

  function insertTable() {
    editor?.commands.insertContent({
      type: 'embeddedTable',
      attrs: { id: `t_${Date.now()}`, name: 'Table', tableData: defaultTable() },
    })
  }

  function pasteTable() {
    const t = tableClipboard.get()
    if (!t) return
    editor?.commands.insertContent({
      type: 'embeddedTable',
      attrs: { id: `t_${Date.now()}`, name: t.name, tableData: t.data },
    })
  }

  if (!note) return null

  const activeColor = editor?.getAttributes('textStyle')?.color ?? null

  const panelContent = (
    <>
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

        <ToolBtn onClick={insertTable} title="Insert table at cursor">
          <LayoutGrid size={14} />
        </ToolBtn>
        {clipboardHasTable && (
          <ToolBtn onClick={pasteTable} title="Paste copied table at cursor">
            <ClipboardPaste size={14} />
          </ToolBtn>
        )}
      </div>

      {/* ── Editor body ── */}
      <div
        className="flex-1 overflow-y-auto px-6 py-5"
        style={{ color: dark ? 'rgb(248 250 252)' : 'rgb(15 23 42)' }}>
        <EditorContent editor={editor} />
      </div>
    </>
  )

  return (
    <div className={inline ? 'h-full' : 'fixed inset-0 z-50 flex justify-end'}>
      {/* Heading size overrides */}
      <style>{`
        .note-editor-prose h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.25; margin: 1rem 0 0.5rem; }
        .note-editor-prose h2 { font-size: 1.5rem;   font-weight: 600; line-height: 1.3;  margin: 0.875rem 0 0.5rem; }
        .note-editor-prose h3 { font-size: 1.25rem;  font-weight: 600; line-height: 1.4;  margin: 0.75rem 0 0.5rem; }
      `}</style>

      {/* Backdrop — modal mode only */}
      {!inline && (
        <div
          className={cn(
            'absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'relative flex flex-col h-full bg-white dark:bg-slate-900',
          inline
            ? 'overflow-hidden'
            : cn(
                'border-l border-slate-200 dark:border-slate-800 shadow-2xl',
                'transition-transform duration-300 ease-out',
                visible ? 'translate-x-0' : 'translate-x-full'
              )
        )}
        style={inline ? {} : { width }}
      >
        {!inline && (
          <div onMouseDown={startResize}
            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10" />
        )}
        {panelContent}
      </div>
    </div>
  )
}
