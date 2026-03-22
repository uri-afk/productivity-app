import { FileText, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function NoteCard({ note, onClick, onDelete }) {
  const preview = stripHtml(note.content).slice(0, 120)
  const date = note.created_at ? format(parseISO(note.created_at), 'MMM d, yyyy') : ''

  return (
    <div
      onClick={() => onClick(note)}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
          <FileText size={15} className="text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{note.title}</p>
          {preview && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{preview}</p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">{date}</p>
        </div>
      </div>

      <button
        onClick={e => { e.stopPropagation(); onDelete(note.id) }}
        className="absolute top-3 right-3 p-1.5 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}
