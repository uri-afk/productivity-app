import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronRight, FileText, X, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import NoteEditor from './NoteEditor'

// ── NoteSection ───────────────────────────────────────────────────
function NoteSection({
  section, notes, collapsed, onToggleCollapse,
  renaming, onStartRename, onRename, canDelete, onDelete,
  onCreate, onSelectNote, onDeleteNote, isFirst,
}) {
  const [addingNote, setAddingNote] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [renameVal, setRenameVal] = useState(section.name)
  const renameRef = useRef(null)
  const addRef = useRef(null)

  useEffect(() => {
    setRenameVal(section.name)
  }, [section.name])

  useEffect(() => {
    if (renaming) renameRef.current?.focus()
  }, [renaming])

  useEffect(() => {
    if (addingNote) addRef.current?.focus()
  }, [addingNote])

  // Listen for global "open add note" (from top nav + New button)
  useEffect(() => {
    if (!isFirst) return
    function handler() { setAddingNote(true) }
    document.addEventListener('open-add-note', handler)
    return () => document.removeEventListener('open-add-note', handler)
  }, [isFirst])

  async function handleCreate() {
    const title = newTitle.trim()
    if (!title) { setAddingNote(false); return }
    const { data } = await onCreate({ title, type: 'text', content: '', section_id: section.id })
    setNewTitle('')
    setAddingNote(false)
    if (data) onSelectNote(data)
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2 group/sec">
        <button onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0">
          <ChevronRight size={14} className={cn('transition-transform duration-150', !collapsed && 'rotate-90')} />
        </button>

        {renaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={() => onRename(renameVal.trim() || section.name)}
            onKeyDown={e => {
              if (e.key === 'Enter') onRename(renameVal.trim() || section.name)
              if (e.key === 'Escape') onRename(section.name)
            }}
            className="text-sm font-semibold text-slate-700 dark:text-slate-300 bg-transparent outline-none border-b border-blue-500 min-w-[80px]"
          />
        ) : (
          <button onDoubleClick={onStartRename}
            className="text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors">
            {section.name}
          </button>
        )}

        <span className="text-xs text-slate-400 dark:text-slate-500">{notes.length}</span>

        {canDelete && (
          <button onClick={onDelete}
            className="opacity-0 group-hover/sec:opacity-100 p-0.5 text-slate-400 hover:text-red-500 transition-all">
            <Trash2 size={11} />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden mb-1">
          {notes.map(note => (
            <div key={note.id}
              onClick={() => onSelectNote(note)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group/note border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 truncate">
                {note.title || <span className="italic text-slate-400">Untitled</span>}
              </span>
              <button
                onClick={e => { e.stopPropagation(); onDeleteNote(note.id) }}
                className="opacity-0 group-hover/note:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}

          {addingNote ? (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <input
                ref={addRef}
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); handleCreate() }
                  if (e.key === 'Escape') { setAddingNote(false); setNewTitle('') }
                }}
                onBlur={() => { if (!newTitle.trim()) { setAddingNote(false); setNewTitle('') } }}
                placeholder="Note title…"
                className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder-slate-400"
              />
              <button onClick={() => { setAddingNote(false); setNewTitle('') }}
                className="p-1 text-slate-400 hover:text-slate-600 shrink-0">
                <X size={13} />
              </button>
            </div>
          ) : null}

          <button
            onClick={() => setAddingNote(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 w-full transition-colors">
            <Plus size={13} /> Add note
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main NoteListView ─────────────────────────────────────────────
export default function NoteListView({ notes, project, onCreateNote, onUpdateNote, onDeleteNote, onUpdateProject }) {
  const sections = project?.note_sections ?? [{ id: 'general', name: 'General' }]
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [renamingSection, setRenamingSection] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)

  // Keep selected note in sync with live data
  useEffect(() => {
    if (selectedNote) {
      const fresh = notes.find(n => n.id === selectedNote.id)
      if (fresh) setSelectedNote(fresh)
    }
  }, [notes]) // eslint-disable-line

  function toggleSection(id) {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function addSection() {
    const id = `s_${Date.now()}`
    const updated = [...sections, { id, name: 'New Section' }]
    await onUpdateProject(project.id, { note_sections: updated })
    setRenamingSection(id)
  }

  async function renameSection(sectionId, name) {
    const updated = sections.map(s => s.id === sectionId ? { ...s, name } : s)
    await onUpdateProject(project.id, { note_sections: updated })
    setRenamingSection(null)
  }

  async function deleteSection(sectionId) {
    const reassigned = notes.filter(n => (n.section_id ?? 'general') === sectionId)
    await Promise.all(reassigned.map(n => onUpdateNote(n.id, { section_id: 'general' })))
    await onUpdateProject(project.id, { note_sections: sections.filter(s => s.id !== sectionId) })
  }

  // Only show text notes in the list view (not task_table type)
  const textNotes = notes.filter(n => n.type !== 'task_table')

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <NoteSection
          key={section.id}
          section={section}
          notes={textNotes.filter(n => (n.section_id ?? 'general') === section.id)}
          collapsed={collapsedSections.has(section.id)}
          onToggleCollapse={() => toggleSection(section.id)}
          renaming={renamingSection === section.id}
          onStartRename={() => setRenamingSection(section.id)}
          onRename={name => renameSection(section.id, name)}
          canDelete={section.id !== 'general'}
          onDelete={() => deleteSection(section.id)}
          onCreate={onCreateNote}
          onSelectNote={setSelectedNote}
          onDeleteNote={onDeleteNote}
          isFirst={idx === 0}
        />
      ))}

      <button
        onClick={addSection}
        className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 transition-colors">
        <Plus size={14} /> Add section
      </button>

      {selectedNote && (
        <NoteEditor
          note={selectedNote}
          onClose={() => setSelectedNote(null)}
          onUpdate={onUpdateNote}
        />
      )}
    </div>
  )
}
