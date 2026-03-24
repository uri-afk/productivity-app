import { useState, useRef, useEffect } from 'react'
import { Plus, ChevronRight, FileText, X, Trash2, GripVertical, FolderInput } from 'lucide-react'
import { cn } from '../../lib/cn'
import NoteEditor from './NoteEditor'
import { useProjectsContext } from '../../lib/ProjectsContext'

// ── Move popup ─────────────────────────────────────────────────────
// Shows sections in current project + other projects to move a note to
function NoteMovePopup({ note, currentProject, allProjects, sections, onMoveToSection, onMoveToProject, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const otherProjects = allProjects.filter(p => p.id !== currentProject.id)

  return (
    <div ref={ref}
      className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1 min-w-[180px]">

      {/* Sections in current project */}
      <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        Move to section
      </p>
      {sections.map(s => (
        <button key={s.id}
          disabled={s.id === (note.section_id ?? 'general')}
          onClick={() => { onMoveToSection(note.id, s.id); onClose() }}
          className={cn(
            'w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2',
            s.id === (note.section_id ?? 'general')
              ? 'text-slate-300 dark:text-slate-600 cursor-default'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          )}>
          <ChevronRight size={10} className="text-slate-400" />
          {s.name}
        </button>
      ))}

      {/* Other projects */}
      {otherProjects.length > 0 && (
        <>
          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
          <p className="px-3 pt-1 pb-0.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
            Move to project
          </p>
          {otherProjects.map(p => (
            <button key={p.id}
              onClick={() => { onMoveToProject(note.id, p.id); onClose() }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
              <span className="w-3 h-3 rounded flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                style={{ backgroundColor: p.color ?? '#6366f1' }}>
                {p.name[0]}
              </span>
              {p.name}
            </button>
          ))}
        </>
      )}
    </div>
  )
}

// ── NoteSection ───────────────────────────────────────────────────
function NoteSection({
  section, notes, collapsed, onToggleCollapse,
  renaming, onStartRename, onRename, canDelete, onDelete,
  onCreate, onSelectNote, onDeleteNote, onMoveToSection, onOpenMovePopup, isFirst,
  dragNoteIdRef, isDraggingNoteRef,
}) {
  const [addingNote, setAddingNote] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [renameVal, setRenameVal] = useState(section.name)
  const [isDragOver, setIsDragOver] = useState(false)
  const renameRef = useRef(null)
  const addRef = useRef(null)

  useEffect(() => { setRenameVal(section.name) }, [section.name])
  useEffect(() => { if (renaming) renameRef.current?.focus() }, [renaming])
  useEffect(() => { if (addingNote) addRef.current?.focus() }, [addingNote])

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
    <div
      onDragOver={e => {
        if (!isDraggingNoteRef.current) return
        e.preventDefault()
        setIsDragOver(true)
      }}
      onDragLeave={e => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false)
      }}
      onDrop={e => {
        e.preventDefault()
        setIsDragOver(false)
        const noteId = dragNoteIdRef.current
        if (noteId) onMoveToSection(noteId, section.id)
      }}
      className={cn(isDragOver && 'ring-2 ring-blue-400 ring-offset-1 rounded-xl')}
    >
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2 group/sec">
        <button onClick={onToggleCollapse}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors shrink-0">
          <ChevronRight size={14} className={cn('transition-transform duration-150', !collapsed && 'rotate-90')} />
        </button>

        {renaming ? (
          <input ref={renameRef} value={renameVal}
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
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-visible mb-1">
          {notes.map(note => (
            <NoteRow
              key={note.id}
              note={note}
              onSelect={() => onSelectNote(note)}
              onDelete={() => onDeleteNote(note.id)}
              onOpenMovePopup={onOpenMovePopup}
              dragNoteIdRef={dragNoteIdRef}
              isDraggingNoteRef={isDraggingNoteRef}
            />
          ))}

          {addingNote ? (
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <input ref={addRef} value={newTitle}
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

// ── NoteRow ───────────────────────────────────────────────────────
function NoteRow({ note, onSelect, onDelete, onOpenMovePopup, dragNoteIdRef, isDraggingNoteRef }) {
  return (
    <div
      draggable
      onDragStart={e => {
        dragNoteIdRef.current = note.id
        isDraggingNoteRef.current = true
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('application/x-note-id', note.id)
      }}
      onDragEnd={() => {
        dragNoteIdRef.current = null
        isDraggingNoteRef.current = false
      }}
      onClick={onSelect}
      className="flex items-center gap-2 px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer group/note border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors">
      <GripVertical size={13} className="text-slate-300 dark:text-slate-600 shrink-0 cursor-grab active:cursor-grabbing" />
      <FileText size={14} className="text-slate-400 shrink-0" />
      <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 truncate">
        {note.title || <span className="italic text-slate-400">Untitled</span>}
      </span>
      <button
        onClick={e => { e.stopPropagation(); onOpenMovePopup(note.id, e.currentTarget.getBoundingClientRect()) }}
        className="opacity-0 group-hover/note:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-all shrink-0"
        title="Move to section or project">
        <FolderInput size={13} />
      </button>
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover/note:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all shrink-0">
        <X size={13} />
      </button>
    </div>
  )
}

// ── Main NoteListView ─────────────────────────────────────────────
export default function NoteListView({ notes, project, onCreateNote, onUpdateNote, onDeleteNote, onUpdateProject }) {
  const { projects } = useProjectsContext() ?? { projects: [] }
  const sections = project?.note_sections ?? [{ id: 'general', name: 'General' }]
  const [collapsedSections, setCollapsedSections] = useState(new Set())
  const [renamingSection, setRenamingSection] = useState(null)
  const [selectedNote, setSelectedNote] = useState(null)
  const [movePopup, setMovePopup] = useState(null) // { noteId, anchor }

  // Desktop = wide enough to show the note list + inline editor side-by-side
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const handler = () => setIsDesktop(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Refs for drag — set synchronously so dragover/drop see correct values
  const dragNoteIdRef = useRef(null)
  const isDraggingNoteRef = useRef(false)

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

  function handleMoveToSection(noteId, sectionId) {
    onUpdateNote(noteId, { section_id: sectionId })
  }

  function openMovePopup(noteId, rect) {
    setMovePopup({ noteId, x: rect.left, y: rect.bottom + 4 })
  }

  function handleMoveToProject(noteId, targetProjectId) {
    onUpdateNote(noteId, { project_id: targetProjectId, section_id: 'general' })
    // Note disappears from current project's list via realtime
    if (selectedNote?.id === noteId) setSelectedNote(null)
  }

  const textNotes = notes.filter(n => n.type !== 'task_table')

  // The notes list (left column)
  const notesList = (
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
          onMoveToSection={handleMoveToSection}
          onOpenMovePopup={openMovePopup}
          isFirst={idx === 0}
          dragNoteIdRef={dragNoteIdRef}
          isDraggingNoteRef={isDraggingNoteRef}
        />
      ))}

      <div className="flex items-center gap-3">
        <button
          onClick={addSection}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1 transition-colors">
          <Plus size={14} /> Add section
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Move-to popup (portal, always rendered at fixed position) */}
      {movePopup && (() => {
        const note = notes.find(n => n.id === movePopup.noteId)
        if (!note) return null
        return (
          <div style={{ position: 'fixed', top: movePopup.y, left: movePopup.x, zIndex: 60 }}>
            <NoteMovePopup
              note={note}
              currentProject={project}
              allProjects={projects}
              sections={sections}
              onMoveToSection={handleMoveToSection}
              onMoveToProject={handleMoveToProject}
              onClose={() => setMovePopup(null)}
            />
          </div>
        )
      })()}

      {/* Desktop: side-by-side list + inline editor */}
      {isDesktop ? (
        <div className="flex gap-4 items-start">
          {/* Notes list — narrows when an editor is open */}
          <div className={cn('min-w-0 shrink-0', selectedNote ? 'w-72' : 'flex-1')}>
            {notesList}
          </div>

          {/* Inline editor panel — sticky + explicit height so the editor body can scroll */}
          {selectedNote ? (
            <div className="flex-1 min-w-0 sticky top-4 h-[calc(100vh-7rem)] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <NoteEditor
                inline
                note={selectedNote}
                onClose={() => setSelectedNote(null)}
                onUpdate={onUpdateNote}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0 sticky top-4 h-48 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center">
              <p className="text-sm text-slate-400 dark:text-slate-500">Select a note to open it</p>
            </div>
          )}
        </div>
      ) : (
        /* Mobile: full-width list + modal editor */
        <>
          {notesList}
          {selectedNote && (
            <NoteEditor
              note={selectedNote}
              onClose={() => setSelectedNote(null)}
              onUpdate={onUpdateNote}
            />
          )}
        </>
      )}
    </>
  )
}
