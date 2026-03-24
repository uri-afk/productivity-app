import { useState, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, AlertCircle, Calendar, Flag } from 'lucide-react'
import { useProjectsContext } from '../lib/ProjectsContext'
import { useAllTasks } from '../hooks/useAllTasks'
import { formatDueDate, dueDateStatus } from '../lib/dates'
import { cn } from '../lib/cn'
import { parseISO, isValid, isThisWeek, startOfDay } from 'date-fns'

const PRIORITY_COLORS = {
  high:   { bg: '#ef444420', text: '#ef4444' },
  medium: { bg: '#f59e0b20', text: '#f59e0b' },
  low:    { bg: '#6b728020', text: '#6b7280' },
}
const FILTERS = [
  { id: 'week', label: 'This week' },
  { id: 'today', label: 'Today' },
  { id: 'all', label: 'All' },
]

function filterTask(task, filter) {
  if (!task.due_date) return filter === 'all'
  const d = parseISO(task.due_date)
  if (!isValid(d)) return filter === 'all'
  const status = dueDateStatus(task.due_date)
  if (status === 'overdue') return true // always show overdue
  if (filter === 'today') return status === 'today'
  if (filter === 'week') return isThisWeek(d, { weekStartsOn: 1 }) || status === 'today'
  return true // 'all'
}

function PriorityDot({ value }) {
  const c = PRIORITY_COLORS[value] ?? PRIORITY_COLORS.medium
  return <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.text }} />
}

function DueBadge({ dateStr }) {
  const status = dueDateStatus(dateStr)
  const label = formatDueDate(dateStr)
  if (!label) return null
  return (
    <span className={cn(
      'text-xs font-medium px-1.5 py-0.5 rounded-md whitespace-nowrap',
      status === 'overdue' && 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
      status === 'today'   && 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
      status === 'future'  && 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
    )}>
      {label}
    </span>
  )
}

function SubtaskCount({ task, projectId, onNavigate }) {
  const [expanded, setExpanded] = useState(false)
  const openSubs = (task.subtasks ?? []).filter(s => s.status !== 'done')
  if (openSubs.length === 0) return null

  return (
    <div className="ml-4 mt-1">
      <button
        onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
        className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {openSubs.length} open subtask{openSubs.length !== 1 ? 's' : ''}
      </button>
      {expanded && (
        <div className="mt-1 space-y-0.5 pl-4 border-l border-slate-200 dark:border-slate-700">
          {openSubs.map(s => (
            <div
              key={s.id}
              onClick={() => onNavigate(projectId)}
              className="flex items-center gap-2 py-0.5 cursor-pointer hover:text-slate-900 dark:hover:text-white"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">{s.title || 'Untitled'}</span>
              {s.due_date && <DueBadge dateStr={s.due_date} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({ task, project, sectionName, onNavigate }) {
  const status = dueDateStatus(task.due_date)

  return (
    <div
      className={cn(
        'group px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
        'hover:bg-slate-100 dark:hover:bg-slate-800/60',
        status === 'today' && 'bg-amber-50/60 dark:bg-amber-900/10 hover:bg-amber-100/80 dark:hover:bg-amber-900/20',
      )}
      onClick={() => onNavigate(task.project_id, task.section_id, task.id)}
    >
      <div className="flex items-center gap-2 min-w-0">
        <PriorityDot value={task.priority} />
        <span className="flex-1 text-sm text-slate-800 dark:text-slate-200 truncate">{task.title || 'Untitled'}</span>
        {task.due_date && <DueBadge dateStr={task.due_date} />}
      </div>
      <div className="flex items-center gap-1.5 mt-0.5 ml-3.5">
        {project && (
          <span className="text-xs text-slate-400 dark:text-slate-500 truncate">
            <span className="font-medium" style={{ color: project.color ?? '#6366f1' }}>{project.name}</span>
            {sectionName && sectionName !== 'General' && (
              <> · {sectionName}</>
            )}
          </span>
        )}
      </div>
      <SubtaskCount task={task} projectId={task.project_id} onNavigate={() => onNavigate(task.project_id, task.section_id, task.id)} />
    </div>
  )
}

function GroupSection({ title, tasks, projects, projectMap, isOverdue, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="mb-5">
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-2 mb-2 w-full text-left"
      >
        {collapsed ? <ChevronRight size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isOverdue ? 'text-red-500 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'
        )}>
          {title}
        </span>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full font-medium',
          isOverdue
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
        )}>
          {tasks.length}
        </span>
        {isOverdue && <AlertCircle size={13} className="text-red-400 dark:text-red-500" />}
      </button>

      {!collapsed && (
        <div className="space-y-0.5">
          {tasks.map(task => {
            const project = projectMap[task.project_id]
            const sections = project?.task_sections ?? [{ id: 'general', name: 'General' }]
            const section = sections.find(s => s.id === (task.section_id ?? 'general'))
            return (
              <TaskRow
                key={task.id}
                task={task}
                project={project}
                sectionName={section?.name}
                onNavigate={onNavigate}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { setActiveTab } = useOutletContext()
  const { projects } = useProjectsContext()
  const { tasks, loading } = useAllTasks()
  const [filter, setFilter] = useState('week')
  const navigate = useNavigate()

  const projectMap = useMemo(
    () => Object.fromEntries(projects.map(p => [p.id, p])),
    [projects]
  )

  function handleNavigate(projectId, sectionId, taskId) {
    setActiveTab('tasks')
    navigate(`/project/${projectId}`, { state: { highlightTaskId: taskId, sectionId } })
  }

  const { overdue, byProject } = useMemo(() => {
    const filtered = tasks.filter(t => filterTask(t, filter))
    const overdue = filtered.filter(t => dueDateStatus(t.due_date) === 'overdue')
    const rest    = filtered.filter(t => dueDateStatus(t.due_date) !== 'overdue')

    // Group rest by project
    const byProject = {}
    for (const task of rest) {
      if (!byProject[task.project_id]) byProject[task.project_id] = []
      byProject[task.project_id].push(task)
    }

    return { overdue, byProject }
  }, [tasks, filter])

  const totalVisible = useMemo(() => {
    return overdue.length + Object.values(byProject).reduce((s, arr) => s + arr.length, 0)
  }, [overdue, byProject])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      {/* Header + filter */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">My Tasks</h2>
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1 rounded-md text-xs font-medium transition-colors',
                filter === f.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {totalVisible === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-10 text-center">
          <Calendar className="mx-auto mb-3 text-slate-300 dark:text-slate-600" size={32} strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No tasks for this period</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {filter === 'today' ? 'Nothing due today' : filter === 'week' ? 'Nothing due this week' : 'All caught up!'}
          </p>
        </div>
      ) : (
        <div>
          {overdue.length > 0 && (
            <GroupSection
              title="Overdue"
              tasks={overdue}
              projectMap={projectMap}
              isOverdue
              onNavigate={handleNavigate}
            />
          )}

          {Object.entries(byProject).map(([projectId, projectTasks]) => {
            const project = projectMap[projectId]
            return (
              <GroupSection
                key={projectId}
                title={project?.name ?? 'Unknown project'}
                tasks={projectTasks}
                projectMap={projectMap}
                isOverdue={false}
                onNavigate={handleNavigate}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
