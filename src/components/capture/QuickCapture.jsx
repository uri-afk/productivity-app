import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, CheckSquare, FileText, ChevronDown, Camera, Mic, Paperclip, Square, Loader2, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { useProjectsContext } from '../../lib/ProjectsContext'
import { uploadNoteFile } from '../../lib/noteStorage'
import { cn } from '../../lib/cn'

// Build the HTML content string from body text + uploaded attachments
function buildNoteContent(body, uploaded) {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
  let html = body.trim() ? `<p>${esc(body.trim())}</p>` : ''
  for (const att of uploaded) {
    if (att.type === 'image') {
      html += `<div data-type="embedded-image" data-path="${att.path}" data-filename="${att.filename}" data-size="medium"></div>`
    } else if (att.type === 'audio') {
      html += `<div data-type="embedded-audio" data-path="${att.path}" data-filename="${att.filename}"></div>`
    } else {
      html += `<div data-type="embedded-file" data-path="${att.path}" data-filename="${att.filename}" data-mimetype="${att.mimetype ?? ''}" data-filesize="${att.size ?? 0}"></div>`
    }
  }
  return html
}

export default function QuickCapture({ open, onClose }) {
  const { user } = useAuth()
  const { projects } = useProjectsContext()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('task')
  const [projectId, setProjectId] = useState('')
  const [sectionId, setSectionId] = useState('general')
  const [body, setBody] = useState('')
  // pending: { id, file, type:'image'|'audio'|'file', localUrl, filename, mimetype, size }
  const [pending, setPending] = useState([])
  const [saving, setSaving] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const titleRef = useRef(null)
  const photoInputRef = useRef(null)
  const fileInputRef = useRef(null)

  const selectedProject = projects.find(p => p.id === projectId)
  const sections = type === 'task'
    ? (selectedProject?.task_sections  ?? [{ id: 'general', name: 'General' }])
    : (selectedProject?.note_sections  ?? [{ id: 'general', name: 'General' }])

  // Reset on open
  useEffect(() => {
    if (!open) return
    setTitle(''); setType('task'); setSectionId('general')
    setBody(''); setPending([]); setSaving(false)
    if (projects.length > 0) setProjectId(projects[0].id)
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [open, projects])

  useEffect(() => { setSectionId('general') }, [projectId, type])

  // Cleanup local object URLs when modal closes or pending changes
  useEffect(() => {
    if (!open) pending.forEach(p => URL.revokeObjectURL(p.localUrl))
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Recording timer
  useEffect(() => {
    if (!isRecording) return
    const id = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [isRecording])

  function addPending(file, attachType) {
    const localUrl = URL.createObjectURL(file)
    setPending(prev => [...prev, {
      id: `${Date.now()}-${Math.random()}`,
      file, type: attachType, localUrl,
      filename: file.name, mimetype: file.type, size: file.size,
    }])
  }

  function removePending(id) {
    setPending(prev => {
      const item = prev.find(p => p.id === id)
      if (item) URL.revokeObjectURL(item.localUrl)
      return prev.filter(p => p.id !== id)
    })
  }

  function handlePhotoChange(e) {
    Array.from(e.target.files ?? []).forEach(f => addPending(f, 'image'))
    e.target.value = ''
  }

  function handleFileChange(e) {
    Array.from(e.target.files ?? []).forEach(f =>
      addPending(f, f.type.startsWith('image/') ? 'image' : 'file')
    )
    e.target.value = ''
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? ''
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const mimeUsed = mr.mimeType || 'audio/webm'
        const ext = mimeUsed.includes('mp4') ? 'm4a' : mimeUsed.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunksRef.current, { type: mimeUsed })
        const file = new File([blob], `voice-memo-${Date.now()}.${ext}`, { type: mimeUsed })
        addPending(file, 'audio')
      }
      mr.start(250)
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecordingSeconds(0)
    } catch {
      // silently fail — browser will show its own permission prompt denial UI
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  async function handleSave() {
    if (!title.trim() || !projectId || saving) return
    setSaving(true)

    if (type === 'task') {
      const today = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('tasks')
        .insert({ title: title.trim(), status: 'todo', priority: 'medium', tags: [],
          due_date: today, project_id: projectId, user_id: user.id })
        .select().single()
      setSaving(false)
      if (!error && data) {
        onClose()
        navigate(`/project/${projectId}`, { state: { highlightTaskId: data.id, sectionId, tab: 'tasks' } })
      }
      return
    }

    // ── Note path ────────────────────────────────────────────────────
    // 1. Create note
    const { data: note, error: noteErr } = await supabase
      .from('notes')
      .insert({ title: title.trim(), type: 'text', content: '', project_id: projectId, user_id: user.id })
      .select().single()

    if (noteErr || !note) { setSaving(false); return }

    // 2. Upload pending attachments
    const uploaded = []
    for (const att of pending) {
      try {
        const { path } = await uploadNoteFile(att.file, user.id, note.id)
        uploaded.push({ ...att, path })
      } catch (err) {
        console.error('Attachment upload failed:', err)
      }
    }

    // 3. Build and save content
    const content = buildNoteContent(body, uploaded)
    if (content) await supabase.from('notes').update({ content }).eq('id', note.id)

    // 4. Clean up local URLs
    pending.forEach(p => URL.revokeObjectURL(p.localUrl))

    setSaving(false)
    onClose()
    navigate(`/project/${projectId}`, { state: { openNoteId: note.id, tab: 'notes' } })
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'Enter' && !e.shiftKey && e.target === titleRef.current) {
      e.preventDefault(); handleSave()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className={cn(
        'relative w-full sm:max-w-md bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700',
        'rounded-t-2xl sm:rounded-2xl flex flex-col',
        'max-h-[90dvh]',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <span className="text-sm font-semibold text-slate-900 dark:text-white">Quick capture</span>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-3">
            {/* Title */}
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Title…"
              className="w-full text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 py-1 border-b border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
            />

            {/* Type toggle */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 w-fit">
              {[
                { id: 'task', icon: CheckSquare, label: 'Task' },
                { id: 'note', icon: FileText,    label: 'Note' },
              ].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setType(id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors',
                    type === id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                  )}>
                  <Icon size={12} /> {label}
                </button>
              ))}
            </div>

            {/* Note body + attachments */}
            {type === 'note' && (
              <>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Note body… (optional)"
                  rows={3}
                  className="w-full text-sm bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 resize-none border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 focus:border-blue-500 transition-colors"
                />

                {/* Attachment buttons */}
                <div className="flex items-center gap-2">
                  <button onClick={() => photoInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Camera size={13} /> Photo
                  </button>
                  {isRecording ? (
                    <button onClick={stopRecording}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-xs text-red-600 dark:text-red-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {String(Math.floor(recordingSeconds / 60)).padStart(2,'0')}:{String(recordingSeconds % 60).padStart(2,'0')}
                      <Square size={10} fill="currentColor" />
                    </button>
                  ) : (
                    <button onClick={startRecording}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <Mic size={13} /> Voice
                    </button>
                  )}
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Paperclip size={13} /> File
                  </button>
                </div>

                {/* Pending attachments */}
                {pending.length > 0 && (
                  <div className="space-y-1.5">
                    {pending.map(att => (
                      <div key={att.id} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        {att.type === 'image' && (
                          <img src={att.localUrl} alt={att.filename} className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        {att.type === 'audio' && (
                          <audio src={att.localUrl} controls className="flex-1 h-7" />
                        )}
                        {att.type === 'image' && (
                          <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate">{att.filename}</span>
                        )}
                        {att.type === 'file' && (
                          <>
                            <Paperclip size={13} className="text-slate-400 shrink-0" />
                            <span className="flex-1 text-xs text-slate-600 dark:text-slate-400 truncate">{att.filename}</span>
                          </>
                        )}
                        <button onClick={() => removePending(att.id)}
                          className="p-1 text-slate-400 hover:text-red-500 transition-colors shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden inputs */}
                <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
              </>
            )}

            {/* Project */}
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Project</label>
              <div className="relative">
                <select value={projectId} onChange={e => setProjectId(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-8 appearance-none outline-none focus:border-blue-500 text-slate-900 dark:text-white transition-colors">
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Section */}
            {sections.length > 1 && (
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Section</label>
                <div className="relative">
                  <select value={sectionId} onChange={e => setSectionId(e.target.value)}
                    className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 pr-8 appearance-none outline-none focus:border-blue-500 text-slate-900 dark:text-white transition-colors">
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {saving && <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Saving…</span>}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} disabled={!title.trim() || !projectId || saving}
              className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg transition-colors">
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
