import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function useNotes(projectId) {
  const { user } = useAuth()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!projectId) return
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
    setNotes(data ?? [])
    setLoading(false)
  }, [projectId])

  useEffect(() => {
    setLoading(true)
    fetch()
    const channel = supabase
      .channel(`notes-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes', filter: `project_id=eq.${projectId}` },
        fetch
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch, projectId])

  const createNote = async ({ title, type = 'text', content = '', section_id = 'general' }) => {
    const { data, error } = await supabase
      .from('notes')
      .insert({ title, type, content, section_id, project_id: projectId, user_id: user.id })
      .select()
      .single()
    return { data, error }
  }

  const updateNote = async (id, updates) => {
    const { error } = await supabase.from('notes').update(updates).eq('id', id)
    return { error }
  }

  const deleteNote = async (id) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) fetch() // revert on error
    return { error }
  }

  return { notes, loading, createNote, updateNote, deleteNote }
}
