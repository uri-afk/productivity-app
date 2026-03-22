import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { X, Bold, Italic, List, ListOrdered, Heading2, Code } from 'lucide-react'
import { cn } from '../../lib/cn'

function ToolbarButton({ onClick, active, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      className={cn(
        'p-1.5 rounded transition-colors',
        active
          ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-white'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

export default function NoteEditor({ note, onClose, onUpdate }) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [visible, setVisible] = useState(false)
  const saveTimeout = useRef(null)

  // Trigger slide-in after mount
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const editor = useEditor({
    extensions: [StarterKit],
    content: note?.content ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-64 prose prose-sm dark:prose-invert max-w-none text-slate-900 dark:text-white',
      },
    },
    onUpdate: ({ editor }) => {
      clearTimeout(saveTimeout.current)
      saveTimeout.current = setTimeout(() => {
        onUpdate(note.id, { content: editor.getHTML() })
      }, 600)
    },
  })

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      editor?.commands.setContent(note.content ?? '')
    }
  }, [note?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleTitleBlur() {
    if (title.trim() && title !== note?.title) {
      onUpdate(note.id, { title: title.trim() })
    }
  }

  if (!note) return null

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
          'border-l border-slate-200 dark:border-slate-800',
          'shadow-2xl',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          {/* Formatting toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 flex-1 flex-wrap">
              <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                <Bold size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                <Italic size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading">
                <Heading2 size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet list">
                <List size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered list">
                <ListOrdered size={14} />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
                <Code size={14} />
              </ToolbarButton>
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-7 py-7">
          {/* Title */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Note title…"
            className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-transparent outline-none mb-5 placeholder-slate-300 dark:placeholder-slate-600"
          />

          {/* Editor */}
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
