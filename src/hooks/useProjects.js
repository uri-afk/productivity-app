import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function useProjects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })
    setProjects(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetch()
    const channel = supabase
      .channel('projects-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  const createProject = async ({ name, description = '', color = '#6366f1' }) => {
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, description, color, user_id: user.id })
      .select()
      .single()
    return { data, error }
  }

  const updateProject = async (id, updates) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id)
    return { error }
  }

  const deleteProject = async (id) => {
    const { error } = await supabase.from('projects').delete().eq('id', id)
    return { error }
  }

  return { projects, loading, createProject, updateProject, deleteProject }
}
