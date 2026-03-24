import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEditor, EditorContent, ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { Node, mergeAttributes } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, Color, FontSize as TiptapFontSize } from '@tiptap/extension-text-style'
import {
  X, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Minus, Check, ChevronDown, LayoutGrid, Trash2, GripVertical,
  Copy, Scissors, ClipboardPaste, Paperclip, Camera,
  FileText, File, FileSpreadsheet, FileArchive, ImageIcon,
  Loader2,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/ThemeContext'
import { useAuth } from '../../lib/AuthContext'
import { useResizable } from '../../hooks/useResizable'
import { TableGrid, defaultTable } from '../table/tableCore'
import { tableClipboard } from '../../lib/tableClipboard'
import { uploadNoteFile } from '../../lib/noteStorage'


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

const IMAGE_SIZES = {
  small:  { width: 200,    label: 'S' },
  medium: { width: 400,    label: 'M' },
  large:  { width: '100%', label: 'L' },
}

// ─── File type icon ───────────────────────────────────────────────
function FileTypeIcon({ mimetype, size = 14 }) {
  if (!mimetype) return <File size={size} />
  if (mimetype.startsWith('image/')) return <ImageIcon size={size} />
  if (mimetype === 'application/pdf') return <FileText size={size} />
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel') || mimetype === 'text/csv')
    return <FileSpreadsheet size={size} />
  if (mimetype.includes('zip') || mimetype.includes('tar') || mimetype.includes('rar') || mimetype.includes('7z'))
    return <FileArchive size={size} />
  return <FileText size={size} />
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Lightbox ─────────────────────────────────────────────────────
function Lightbox({ url, filename, onClose }) {
  useEffect(() => {
    function handler(e) {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); onClose() }
    }
    // Capture phase so we intercept before NoteEditor's own Escape listener
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [onClose])

  return createPortal(
    <div
      data-lightbox="true"
      className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white/70 hover:text-white hover:bg-white/20 transition-colors"
      >
        <X size={20} />
      </button>
      <img
        src={url}
        alt={filename || 'Image'}
        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
      {filename && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/60 truncate max-w-xs">{filename}</p>
      )}
    </div>,
    document.body
  )
}

// ─── ImageNodeView ────────────────────────────────────────────────
function ImageNodeView({ node, updateAttributes, deleteNode }) {
  const { url, filename, size = 'medium' } = node.attrs
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <NodeViewWrapper className="my-3" contentEditable={false}>
      <div className="relative inline-block group/img max-w-full" data-drag-handle>
        <img
          src={url}
          alt={filename || 'Image'}
          style={{ width: IMAGE_SIZES[size]?.width ?? 400, maxWidth: '100%', display: 'block', borderRadius: 8, cursor: 'zoom-in' }}
          onClick={() => setLightboxOpen(true)}
          draggable={false}
        />

        {/* Size + delete controls */}
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/img:opacity-100 transition-opacity">
          {Object.entries(IMAGE_SIZES).map(([s, { label }]) => (
            <button
              key={s}
              onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
              onClick={e => { e.stopPropagation(); updateAttributes({ size: s }) }}
              className={cn(
                'w-5 h-5 rounded text-[10px] font-bold transition-colors',
                size === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-black/50 text-white hover:bg-black/70'
              )}
            >
              {label}
            </button>
          ))}
          <button
            onMouseDown={e => { e.preventDefault(); e.stopPropagation() }}
            onClick={e => { e.stopPropagation(); deleteNode() }}
            className="w-5 h-5 rounded bg-black/50 text-white hover:bg-red-500/80 flex items-center justify-center transition-colors"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      {lightboxOpen && <Lightbox url={url} filename={filename} onClose={() => setLightboxOpen(false)} />}
    </NodeViewWrapper>
  )
}

// ─── FileNodeView ─────────────────────────────────────────────────
function FileNodeView({ node, deleteNode }) {
  const { url, filename, mimetype, filesize } = node.attrs

  return (
    <NodeViewWrapper className="my-2" contentEditable={false}>
      <div
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 group/file hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
        data-drag-handle
      >
        <div className="text-slate-400 dark:text-slate-500 shrink-0">
          <FileTypeIcon mimetype={mimetype} />
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex-1 text-sm text-blue-600 dark:text-blue-400 hover:underline truncate min-w-0"
        >
          {filename}
        </a>
        {filesize > 0 && (
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{formatFileSize(filesize)}</span>
        )}
        <button
          onMouseDown={e => e.preventDefault()}
          onClick={e => { e.stopPropagation(); deleteNode() }}
          className="opacity-0 group-hover/file:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0"
          title="Remove attachment"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </NodeViewWrapper>
  )
}

// ─── TipTap: EmbeddedImage ─────────────────────────────────────────
const EmbeddedImage = Node.create({
  name: 'embeddedImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url:      { default: '' },
      filename: { default: '' },
      size:     { default: 'medium' },
    }
  },

  parseHTML() {
    return [{
      tag: 'div[data-type="embedded-image"]',
      getAttrs: el => ({
        url:      el.getAttribute('data-url') ?? '',
        filename: el.getAttribute('data-filename') ?? '',
        size:     el.getAttribute('data-size') ?? 'medium',
      }),
    }]
  },

  renderHTML({ node }) {
    return ['div', mergeAttributes({
      'data-type':     'embedded-image',
      'data-url':      node.attrs.url,
      'data-filename': node.attrs.filename,
      'data-size':     node.attrs.size,
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView)
  },
})

// ─── TipTap: EmbeddedFile ──────────────────────────────────────────
const EmbeddedFile = Node.create({
  name: 'embeddedFile',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url:      { default: '' },
      filename: { default: '' },
      mimetype: { default: '' },
      filesize: { default: 0 },
    }
  },

  parseHTML() {
    return [{
      tag: 'div[data-type="embedded-file"]',
      getAttrs: el => ({
        url:      el.getAttribute('data-url') ?? '',
        filename: el.getAttribute('data-filename') ?? '',
        mimetype: el.getAttribute('data-mimetype') ?? '',
        filesize: Number(el.getAttribute('data-filesize') ?? 0),
      }),
    }]
  },

  renderHTML({ node }) {
    return ['div', mergeAttributes({
      'data-type':     'embedded-file',
      'data-url':      node.attrs.url,
      'data-filename': node.attrs.filename,
      'data-mimetype': node.attrs.mimetype,
      'data-filesize': String(node.attrs.filesize),
    })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileNodeView)
  },
})

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
          <button onMouseDown={e => e.stopPropagation()} onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors shrink-0" title="Copy table">
            <Copy size={13} />
          </button>
          <button onMouseDown={e => e.stopPropagation()} onClick={handleCut}
            className="p-1 text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 transition-colors shrink-0" title="Cut table">
            <Scissors size={13} />
          </button>
          <button onMouseDown={e => e.stopPropagation()} onClick={deleteNode}
            className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0" title="Delete table">
            <Trash2 size={13} />
          </button>
        </div>

        <div ref={contentRef} style={height ? { height, overflowY: 'auto' } : {}}>
          <TableGrid table={tableData} onChange={newData => updateAttributes({ tableData: newData })} />
        </div>

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

// ─── TipTap: EmbeddedTable ─────────────────────────────────────────
const EmbeddedTable = Node.create({
  name: 'embeddedTable',
  group: 'block',
  atom: true,
  draggable: true,

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
  const { user } = useAuth()
  const { width, startResize } = useResizable({ defaultWidth: 600, minWidth: 360, maxWidth: 1100 })
  const [title, setTitle] = useState(note?.title ?? '')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [visible, setVisible] = useState(false)
  const [clipboardHasTable, setClipboardHasTable] = useState(() => tableClipboard.has())
  const [uploadCount, setUploadCount] = useState(0) // number of in-flight uploads
  const [uploadError, setUploadError] = useState(null)
  const titleTimeout = useRef(null)
  const bodyTimeout = useRef(null)
  const savedTimer = useRef(null)
  const fileInputRef = useRef(null)   // all-files picker
  const imageInputRef = useRef(null)  // images-only picker (camera button)

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
    extensions: [StarterKit, Underline, TextStyle, Color, TiptapFontSize, EmbeddedTable, EmbeddedImage, EmbeddedFile],
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
    const handler = e => {
      // Don't close if a lightbox is open
      if (e.key === 'Escape' && !document.querySelector('[data-lightbox]')) onClose()
    }
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

  // ── Upload ────────────────────────────────────────────────────────
  async function handleFiles(fileList) {
    if (!fileList?.length || !user?.id || !note?.id) return
    const files = Array.from(fileList)
    setUploadError(null)
    setUploadCount(c => c + files.length)

    for (const file of files) {
      try {
        const { url } = await uploadNoteFile(file, user.id, note.id)
        const isImage = file.type.startsWith('image/')

        if (isImage) {
          editor?.commands.insertContent({
            type: 'embeddedImage',
            attrs: { url, filename: file.name, size: 'medium' },
          })
        } else {
          editor?.commands.insertContent({
            type: 'embeddedFile',
            attrs: { url, filename: file.name, mimetype: file.type, filesize: file.size },
          })
        }

        // Trigger a save now that content has changed
        saveContent(editor.getHTML())
      } catch (err) {
        console.error('Upload failed:', err)
        setUploadError('Upload failed — check Storage bucket is set up (see supabase/storage-setup.sql)')
        setTimeout(() => setUploadError(null), 5000)
      } finally {
        setUploadCount(c => c - 1)
      }
    }
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

        <Divider />

        {/* Attachment buttons */}
        <ToolBtn
          onClick={() => fileInputRef.current?.click()}
          title="Attach file (PDF, Word, Excel, images…)"
          disabled={uploadCount > 0}
        >
          {uploadCount > 0
            ? <Loader2 size={14} className="animate-spin" />
            : <Paperclip size={14} />
          }
        </ToolBtn>

        <ToolBtn
          onClick={() => imageInputRef.current?.click()}
          title="Attach photo or image"
          disabled={uploadCount > 0}
        >
          <Camera size={14} />
        </ToolBtn>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { handleFiles(e.target.files); e.target.value = '' }}
        />
      </div>

      {/* Upload error banner */}
      {uploadError && (
        <div className="mx-4 mt-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-600 dark:text-red-400 shrink-0">
          {uploadError}
        </div>
      )}

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
      <style>{`
        .note-editor-prose h1 { font-size: 1.875rem; font-weight: 700; line-height: 1.25; margin: 1rem 0 0.5rem; }
        .note-editor-prose h2 { font-size: 1.5rem;   font-weight: 600; line-height: 1.3;  margin: 0.875rem 0 0.5rem; }
        .note-editor-prose h3 { font-size: 1.25rem;  font-weight: 600; line-height: 1.4;  margin: 0.75rem 0 0.5rem; }
      `}</style>

      {!inline && (
        <div
          className={cn(
            'absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300',
            visible ? 'opacity-100' : 'opacity-0'
          )}
          onClick={onClose}
        />
      )}

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
