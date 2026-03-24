import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, FolderOpen, CheckSquare, FileText, X, ArrowRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useProjectsContext } from '../../lib/ProjectsContext'
import { cn } from '../../lib/cn'

const RESULT_TYPES = ['projects', 'tasks', 'notes']

function highlight(text, query) {
  if (!query || !text) return text ?? ''
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-px">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export default function GlobalSearch({ open, onClose, onNavigateProject }) {
  const navigate = useNavigate()
  const { projects } = useProjectsContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ projects: [], tasks: [], notes: [] })
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState(0) // flat index across all results
  const inputRef = useRef(null)
  const containerRef = useRef(null)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults({ projects: [], tasks: [], notes: [] })
      setCursor(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const search = useCallback(async (q) => {
    if (!q.trim()) {
      setResults({ projects: [], tasks: [], notes: [] })
      return
    }
    setLoading(true)
    const pattern = `%${q}%`

    const [projRes, taskRes, noteRes] = await Promise.all([
      supabase.from('projects').select('id, name, color').ilike('name', pattern).limit(5),
      supabase.from('tasks').select('id, title, project_id, section_id, status').ilike('title', pattern).neq('status', 'done').limit(8),
      supabase.from('notes').select('id, title, project_id, section_id, content').ilike('title', pattern).limit(8),
    ])

    setResults({
      projects: projRes.data ?? [],
      tasks:    taskRes.data ?? [],
      notes:    noteRes.data ?? [],
    })
    setCursor(0)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  // Flatten results for keyboard nav
  const flatResults = [
    ...results.projects.map(r => ({ type: 'project', data: r })),
    ...results.tasks.map(r   => ({ type: 'task',    data: r })),
    ...results.notes.map(r   => ({ type: 'note',    data: r })),
  ]

  function handleSelect(item) {
    if (item.type === 'project') {
      onNavigateProject(item.data.id)
      navigate(`/project/${item.data.id}`)
    } else if (item.type === 'task') {
      onNavigateProject(item.data.id, 'tasks')
      navigate(`/project/${item.data.project_id}`, {
        state: { highlightTaskId: item.data.id, sectionId: item.data.section_id }
      })
    } else {
      onNavigateProject(item.data.id, 'notes')
      navigate(`/project/${item.data.project_id}`, {
        state: { openNoteId: item.data.id, tab: 'notes' }
      })
    }
    onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor(c => Math.min(c + 1, flatResults.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor(c => Math.max(c - 1, 0))
    } else if (e.key === 'Enter' && flatResults[cursor]) {
      handleSelect(flatResults[cursor])
    }
  }

  // Scroll selected item into view
  useEffect(() => {
    const el = containerRef.current?.querySelector(`[data-idx="${cursor}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  if (!open) return null

  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))
  const hasResults = flatResults.length > 0

  let flatIdx = 0
  function renderGroup(type, items) {
    if (items.length === 0) return null
    const label   = type === 'project' ? 'Projects' : type === 'task' ? 'Tasks' : 'Notes'
    const Icon    = type === 'project' ? FolderOpen : type === 'task' ? CheckSquare : FileText

    return (
      <div key={type} className="mb-1">
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Icon size={11} />
          {label}
        </div>
        {items.map(item => {
          const idx = flatIdx++
          const isSelected = cursor === idx
          const project = type !== 'project' ? projectMap[item.project_id] : null

          return (
            <button
              key={item.id}
              data-idx={idx}
              onClick={() => handleSelect({ type, data: item })}
              onMouseEnter={() => setCursor(idx)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors rounded-lg',
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              )}
            >
              {type === 'project' && (
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: item.color ?? '#6366f1' }}
                >
                  {item.name[0]}
                </div>
              )}
              {type !== 'project' && (
                <Icon size={14} className="shrink-0 text-slate-400 dark:text-slate-500" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{highlight(item.title ?? item.name, query)}</p>
                {project && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                    <span style={{ color: project.color ?? '#6366f1' }}>{project.name}</span>
                    {type === 'note' && item.content && (
                      <> · {stripHtml(item.content).slice(0, 60)}</>
                    )}
                  </p>
                )}
              </div>
              {isSelected && <ArrowRight size={13} className="shrink-0 opacity-60" />}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search projects, tasks, notes…"
            className="flex-1 text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button onClick={onClose} className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Results */}
        <div ref={containerRef} className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">Type to search…</p>
          )}
          {query.trim() && !loading && !hasResults && (
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">No results for "{query}"</p>
          )}
          {hasResults && (
            <>
              {renderGroup('project', results.projects)}
              {renderGroup('task',    results.tasks)}
              {renderGroup('note',    results.notes)}
            </>
          )}
        </div>

        {/* Footer hint */}
        {hasResults && (
          <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-400 dark:text-slate-500">
            <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">↑↓</kbd> navigate</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">↵</kbd> open</span>
            <span className="flex items-center gap-1"><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  )
}
