import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function useTasks(projectId) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!projectId) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    fetch()
    const channel = supabase
      .channel(`tasks-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        fetch
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch, projectId])

  const createTask = async (fields) => {
    const { data, error } = await supabase
      .from('tasks')
      .insert({ ...fields, project_id: projectId, user_id: user.id, status: 'todo', priority: 'medium', tags: [] })
      .select()
      .single()
    return { data, error }
  }

  const updateTask = async (id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const { error } = await supabase.from('tasks').update(updates).eq('id', id)
    if (error) fetch()
    return { error }
  }

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) fetch() // revert on error
    return { error }
  }

  return { tasks, loading, createTask, updateTask, deleteTask }
}
