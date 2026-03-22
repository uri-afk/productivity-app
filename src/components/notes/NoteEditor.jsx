import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle, Color, FontSize as TiptapFontSize } from '@tiptap/extension-text-style'
import {
  X, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Minus, Check, ChevronDown,
} from 'lucide-react'
import { cn } from '../../lib/cn'


// ─── Preset palettes ──────────────────────────────────────────────
const FONT_SIZES = [
  { label: 'Small',  value: '12px' },
  { label: 'Normal', value: null   },
  { label: 'Large',  value: '18px' },
  { label: 'Huge',   value: '24px' },
]

const COLORS = [
  { label: 'Default', value: null      },
  { label: 'Gray',    value: '#6b7280' },
  { label: 'Red',     value: '#ef4444' },
  { label: 'Orange',  value: '#f97316' },
  { label: 'Amber',   value: '#f59e0b' },
  { label: 'Green',   value: '#22c55e' },
  { label: 'Blue',    value: '#3b82f6' },
  { label: 'Purple',  value: '#a855f7' },
  { label: 'Pink',    value: '#ec4899' },
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

// ─── Main component ───────────────────────────────────────────────
export default function NoteEditor({ note, onClose, onUpdate }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [visible, setVisible] = useState(false)
  const titleTimeout = useRef(null)
  const bodyTimeout = useRef(null)
  const savedTimer = useRef(null)
  const editorWrapperRef = useRef(null)

  function focusEditor() {
    // Defer past the current keydown event so the browser doesn't reset focus
    setTimeout(() => {
      editor?.view?.dom?.focus()
    }, 0)
  }

  // Slide-in animation
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function markSaved() {
    setSaveStatus('saved')
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      TiptapFontSize,
    ],
    content: note?.content ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-64 prose prose-sm dark:prose-invert max-w-none text-slate-900 dark:text-white',
      },
    },
    onUpdate: ({ editor }) => {
      setSaveStatus('saving')
      clearTimeout(bodyTimeout.current)
      bodyTimeout.current = setTimeout(() => {
        onUpdate(note.id, { content: editor.getHTML() })
        markSaved()
      }, 700)
    },
  })

  // Sync when switching notes
  useEffect(() => {
    if (!note) return
    setTitle(note.title)
    editor?.commands.setContent(note.content ?? '')
    setSaveStatus('idle')
  }, [note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape to close
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
      if (val.trim()) {
        onUpdate(note.id, { title: val.trim() })
        markSaved()
      }
    }, 700)
  }

  if (!note) return null

  // Active color for indicator dot
  const activeColor = editor?.getAttributes('textStyle')?.color ?? null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
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
          'relative flex flex-col h-full',
          'w-full sm:w-1/2 min-w-0',
          'bg-white dark:bg-slate-900',
          'border-l border-slate-200 dark:border-slate-800 shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* ── Top bar: saved indicator + close ── */}
        <div className="flex items-center justify-between px-5 h-11 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <SavedIndicator status={saveStatus} />
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
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

          {/* Bold / Italic / Underline */}
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

          {/* Headings */}
          {[1, 2, 3].map(level => (
            <ToolBtn
              key={level}
              onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
              active={editor?.isActive('heading', { level })}
              title={`Heading ${level}`}
            >
              <span className="text-xs font-bold leading-none">H{level}</span>
            </ToolBtn>
          ))}

          <Divider />

          {/* Font size */}
          <Dropdown label="Aa">
            {close => FONT_SIZES.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onMouseDown={e => {
                  e.preventDefault()
                  if (value) editor?.chain().focus().setFontSize(value).run()
                  else editor?.chain().focus().unsetFontSize().run()
                  close()
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 whitespace-nowrap"
              >
                <span style={value ? { fontSize: value } : {}}>{label}</span>
              </button>
            ))}
          </Dropdown>

          {/* Text color */}
          <Dropdown
            label={
              <span className="flex items-center gap-1">
                <span className="font-bold text-xs" style={{ color: activeColor ?? 'currentColor' }}>A</span>
                <span
                  className="w-3 h-0.5 rounded-full"
                  style={{ backgroundColor: activeColor ?? '#6b7280' }}
                />
              </span>
            }
          >
            {close => (
              <div className="px-3 py-2 grid grid-cols-5 gap-1.5">
                {COLORS.map(({ label, value }) => (
                  <button
                    key={label}
                    type="button"
                    title={label}
                    onMouseDown={e => {
                      e.preventDefault()
                      if (value) editor?.chain().focus().setColor(value).run()
                      else editor?.chain().focus().unsetColor().run()
                      close()
                    }}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
                      activeColor === value ? 'border-blue-500' : 'border-transparent'
                    )}
                    style={{ backgroundColor: value ?? '#e2e8f0' }}
                  />
                ))}
              </div>
            )}
          </Dropdown>

          <Divider />

          {/* Lists */}
          <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list">
            <List size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list">
            <ListOrdered size={14} />
          </ToolBtn>

          <Divider />

          {/* Divider line */}
          <ToolBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Divider line">
            <Minus size={14} />
          </ToolBtn>
        </div>

        {/* ── Editor body ── */}
        <div ref={editorWrapperRef} className="flex-1 overflow-y-auto px-6 py-5">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
