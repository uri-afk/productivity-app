import { useState } from 'react'
import { Plus } from 'lucide-react'
import NoteCard from './NoteCard'

export default function NoteList({ notes, onSelect, onCreate, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  async function handleCreate(e) {
    e.preventDefault()
    if (!title.trim()) return
    const { data } = await onCreate({ title: title.trim() })
    setTitle('')
    setAdding(false)
    if (data) onSelect(data) // open editor immediately
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 mb-3">
        {notes.map(note => (
          <NoteCard key={note.id} note={note} onClick={onSelect} onDelete={onDelete} />
        ))}
      </div>

      {notes.length === 0 && !adding && (
        <p className="py-8 text-sm text-slate-400 dark:text-slate-500 text-center">
          No notes yet — add one below
        </p>
      )}

      {adding ? (
        <form onSubmit={handleCreate} className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
          <input
            autoFocus
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') { setAdding(false); setTitle('') } }}
            placeholder="Note title…"
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
          />
          <button type="submit" className="text-xs text-blue-600 font-medium hover:underline">Create</button>
          <button type="button" onClick={() => { setAdding(false); setTitle('') }} className="text-xs text-slate-400 hover:text-slate-600">Cancel</button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
        >
          <Plus size={14} /> Add note
        </button>
      )}
    </div>
  )
}
