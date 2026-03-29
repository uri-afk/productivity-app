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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch, projectId])

  const createTask = async (fields) => {
    // Strip subtask/notes fields that live outside the main tasks table.
    // section_id IS included so tasks are saved to the correct section.
    const { subtasks, task_notes, ...coreFields } = fields

    // Optimistic: task appears instantly in the correct section
    const tempId = `_${Date.now()}`
    const optimistic = {
      id: tempId,
      title: '',
      status: 'todo',
      priority: 'medium',
      tags: [],
      due_date: null,
      subtasks: [],
      task_notes: null,
      section_id: fields.section_id ?? 'general',
      project_id: projectId,
      created_at: new Date().toISOString(),
      ...fields,    // apply all passed fields
      id: tempId,   // always use temp id
    }
    setTasks(prev => [...prev, optimistic])

    // 'general' is a UI sentinel — store null in DB, filter logic handles it
    const dbFields = { ...coreFields }
    if (dbFields.section_id === 'general') dbFields.section_id = null

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        status: 'todo',
        priority: 'medium',
        tags: [],
        ...dbFields,
        project_id: projectId,
        user_id: user.id,
      })
      .select()
      .single()

    if (data) {
      // Preserve local section_id (DB returns null for 'general')
      setTasks(prev => prev.map(t => t.id === tempId ? { ...optimistic, ...data, section_id: optimistic.section_id } : t))
    } else {
      // Insert failed — remove optimistic task
      setTasks(prev => prev.filter(t => t.id !== tempId))
    }
    return { data, error }
  }

  const updateTask = async (id, updates) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
    const dbUpdates = { ...updates }
    if ('section_id' in dbUpdates && dbUpdates.section_id === 'general') dbUpdates.section_id = null
    const { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id)
    if (error) fetch()
    return { error }
  }

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) fetch()
    return { error }
  }

  return { tasks, loading, createTask, updateTask, deleteTask }
}
