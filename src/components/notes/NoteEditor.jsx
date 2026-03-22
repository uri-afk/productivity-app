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
        'p-1.5 rounded text-sm transition-colors',
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
  const saveTimeout = useRef(null)

  const editor = useEditor({
    extensions: [StarterKit],
    content: note?.content ?? '',
    editorProps: {
      attributes: {
        class: 'outline-none min-h-[300px] prose prose-sm dark:prose-invert max-w-none text-slate-900 dark:text-white',
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
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-slate-900">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
        {/* Formatting buttons */}
        {editor && (
          <div className="flex items-center gap-0.5 mr-2">
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
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Code">
              <Code size={14} />
            </ToolbarButton>
          </div>
        )}

        <div className="flex-1" />

        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={14} /> Close
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Note title…"
            className="w-full text-2xl font-bold text-slate-900 dark:text-white bg-transparent outline-none mb-6 placeholder-slate-300 dark:placeholder-slate-600"
          />
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
