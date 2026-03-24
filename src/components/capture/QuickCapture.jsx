import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CheckSquare, FileText, ChevronDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useProjectsContext } from '../../lib/ProjectsContext'
import { cn } from '../../lib/cn'

export default function QuickCapture({ open, onClose }) {
  const { user } = useAuth()
  const { projects } = useProjectsContext()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('task') // 'task' | 'note'
  const [projectId, setProjectId] = useState('')
  const [sectionId, setSectionId] = useState('general')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  const selectedProject = projects.find(p => p.id === projectId)
  const sections = selectedProject?.task_sections ?? [{ id: 'general', name: 'General' }]

  useEffect(() => {
    if (open) {
      setTitle('')
      setType('task')
      setSectionId('general')
      setSaving(false)
      // Default to first project
      if (projects.length > 0) setProjectId(projects[0].id)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open, projects])

  // Reset section when project changes
  useEffect(() => {
    setSectionId('general')
  }, [projectId])

  async function handleSave() {
    if (!title.trim() || !projectId || saving) return
    setSaving(true)

    if (type === 'task') {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: title.trim(),
          status: 'todo',
          priority: 'medium',
          tags: [],
          due_date: today,
          project_id: projectId,
          user_id: user.id,
        })
        .select()
        .single()
      if (!error && data) {
        onClose()
        navigate(`/project/${projectId}`, { state: { highlightTaskId: data.id, sectionId, tab: 'tasks' } })
      }
    } else {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          title: title.trim(),
          type: 'text',
          content: '',
          project_id: projectId,
          user_id: user.id,
        })
        .select()
        .single()
      if (!error && data) {
        onClose()
        navigate(`/project/${projectId}`, { state: { openNoteId: data.id, tab: 'notes' } })
      }
    }
    setSaving(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal — slides up from bottom on mobile, centered on desktop */}
      <div className={cn(
        'relative w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700',
        'rounded-t-2xl sm:rounded-2xl',
        'transition-transform duration-200',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Quick capture</span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Title */}
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Title…"
            className="w-full text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 py-1 border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
          />

          {/* Type toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit">
            <button
              onClick={() => setType('task')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                type === 'task'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <CheckSquare size={12} />
              Task
            </button>
            <button
              onClick={() => setType('note')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                type === 'note'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              <FileText size={12} />
              Note
            </button>
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Project</label>
            <div className="relative">
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-8 appearance-none outline-none focus:border-blue-500 text-slate-900 dark:text-white transition-colors"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Section — only show if project has multiple sections */}
          {sections.length > 1 && (
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Section</label>
              <div className="relative">
                <select
                  value={sectionId}
                  onChange={e => setSectionId(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-8 appearance-none outline-none focus:border-blue-500 text-slate-900 dark:text-white transition-colors"
                >
                  {sections.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Press <kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">↵</kbd> to save
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || !projectId || saving}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
