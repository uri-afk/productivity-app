import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Bold, Italic, List, ListOrdered, Check } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { cn } from '../../lib/cn'
import { useTheme } from '../../lib/ThemeContext'
import { parseTable, TableGrid } from '../table/tableCore'
import { useResizable } from '../../hooks/useResizable'

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

export default function TaskNoteEditorPanel({ note, onBack, onSave }) {
  const { dark } = useTheme()
  const [title, setTitle] = useState(note.title ?? '')
  const [table, setTable] = useState(() => parseTable(note.content))
  const [saved, setSaved] = useState(false)
  const titleTimeout = useRef(null)
  const bodyTimeout = useRef(null)
  const savedTimer = useRef(null)
  const isTable = note.type === 'table'
  const { width, startResize } = useResizable({ defaultWidth: 420, minWidth: 280, maxWidth: 800 })

  const editor = useEditor({
    extensions: [StarterKit],
    content: isTable ? '' : (note.content ?? ''),
    editorProps: { attributes: { class: 'outline-none min-h-[200px] prose prose-sm max-w-none text-sm' } },
    onUpdate: ({ editor }) => {
      clearTimeout(bodyTimeout.current)
      bodyTimeout.current = setTimeout(() => {
        onSave({ ...note, title, content: editor.getHTML() })
        markSaved()
      }, 700)
    },
  })

  useEffect(() => {
    if (!isTable) editor?.commands.setContent(note.content ?? '')
    else setTable(parseTable(note.content))
    setTitle(note.title ?? '')
  }, [note.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function markSaved() {
    setSaved(true)
    clearTimeout(savedTimer.current)
    savedTimer.current = setTimeout(() => setSaved(false), 2000)
  }

  function handleTitleChange(e) {
    const val = e.target.value
    setTitle(val)
    clearTimeout(titleTimeout.current)
    titleTimeout.current = setTimeout(() => {
      const content = isTable ? note.content : (editor?.getHTML() ?? note.content ?? '')
      onSave({ ...note, title: val, content })
      markSaved()
    }, 700)
  }

  function handleTableChange(next) {
    setTable(next)
    clearTimeout(bodyTimeout.current)
    bodyTimeout.current = setTimeout(() => {
      onSave({ ...note, content: JSON.stringify(next) })
      markSaved()
    }, 400)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onBack} />
      <div className="fixed right-0 top-0 bottom-0 z-50 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl"
        style={{ width }}>

        {/* Resize handle */}
        <div onMouseDown={startResize}
          className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-blue-500/30 transition-colors z-10" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800 shrink-0"
          style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))', paddingBottom: '1rem' }}>
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors">
            <ArrowLeft size={15} /> Back to task
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <Check size={11} /> Saved
            </span>
          )}
        </div>

        {/* Title */}
        <div className="px-5 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <input value={title} onChange={handleTitleChange}
            onKeyDown={e => { if (e.key === 'Enter' && !isTable) { e.preventDefault(); setTimeout(() => editor?.view?.dom?.focus(), 0) } }}
            placeholder="Note title…"
            className="w-full text-base font-semibold text-slate-900 dark:text-white bg-transparent outline-none placeholder-slate-300 dark:placeholder-slate-600" />
        </div>

        {isTable ? (
          <div className="flex-1 overflow-auto px-2 py-3">
            <TableGrid table={table} onChange={handleTableChange} containerWidth={width} />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-0.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 shrink-0">
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')} title="Bold"><Bold size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')} title="Italic"><Italic size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')} title="Bullet list"><List size={13} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')} title="Numbered list"><ListOrdered size={13} /></ToolBtn>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4" style={{ color: dark ? 'rgb(248 250 252)' : 'rgb(15 23 42)' }}>
              <EditorContent editor={editor} />
            </div>
          </>
        )}
      </div>
    </>
  )
}
