// Browser notification helpers for task reminders.
// Uses the Notifications API (works when app is open, and on iOS 16.4+ PWAs).

const STORAGE_KEY = 'notified_task_ids'
const MAX_AGE_MS = 24 * 60 * 60 * 1000 // don't re-notify within 24 h

function getNotifiedMap() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') } catch { return {} }
}

function markNotified(taskId) {
  const map = getNotifiedMap()
  map[taskId] = Date.now()
  // Prune old entries
  const cutoff = Date.now() - MAX_AGE_MS * 2
  for (const [id, ts] of Object.entries(map)) {
    if (ts < cutoff) delete map[id]
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function wasRecentlyNotified(taskId) {
  const map = getNotifiedMap()
  const ts = map[taskId]
  return ts && (Date.now() - ts) < MAX_AGE_MS
}

/** Request notification permission. Returns true if granted. */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

/** Returns true if we can show notifications right now. */
export function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted'
}

/**
 * Show a notification for a single task.
 * @param {object} task  - task row
 * @param {string} projectName
 * @param {string} sectionName
 * @param {Function} onNavigate - called with (projectId, taskId) when notification is clicked
 */
function notifyTask(task, projectName, sectionName, onNavigate) {
  if (!canNotify() || wasRecentlyNotified(task.id)) return
  markNotified(task.id)

  const isOverdue = task.due_date < today()
  const title = isOverdue ? `⚠️ Overdue: ${task.title}` : `📅 Due today: ${task.title}`
  const body = [projectName, sectionName].filter(Boolean).join(' › ')

  const n = new Notification(title, {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: task.id,          // deduplicate: same tag replaces previous
    renotify: false,
    data: { projectId: task.project_id, taskId: task.id },
  })

  n.onclick = () => {
    window.focus()
    n.close()
    onNavigate?.(task.project_id, task.id)
  }
}

function today() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check all tasks and fire notifications for anything due today or overdue.
 * Call this once when the app loads / user logs in.
 *
 * @param {Array}    tasks     - all tasks for this user
 * @param {Array}    projects  - all projects (for names)
 * @param {Function} onNavigate - (projectId, taskId) => void
 */
export function checkAndNotifyDueTasks(tasks, projects, onNavigate) {
  if (!canNotify()) return

  const todayStr = today()
  const projectMap = Object.fromEntries(projects.map(p => [p.id, p]))

  for (const task of tasks) {
    if (!task.due_date) continue
    if (task.status === 'done') continue
    if (task.due_date > todayStr) continue  // future

    const project = projectMap[task.project_id]
    const projectName = project?.name ?? ''

    // Find section name
    const sections = project?.task_sections ?? []
    const section = sections.find(s => s.id === task.section_id)
    const sectionName = section?.name ?? ''

    notifyTask(task, projectName, sectionName, onNavigate)
  }
}
