import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export function useAllTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .neq('status', 'done')
      .order('created_at', { ascending: true })
    setTasks(data ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    setLoading(true)
    fetch()
    const channel = supabase
      .channel('all-tasks-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  return { tasks, loading }
}
