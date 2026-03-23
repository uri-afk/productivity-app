import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const DEFAULT_COLUMNS = [
  { name: 'Name',     type: 'text',        col_order: 0, options: [] },
  { name: 'Status',   type: 'select',      col_order: 1, options: ['To Do', 'In Progress', 'Done'] },
  { name: 'Due Date', type: 'date',        col_order: 2, options: [] },
  { name: 'Priority', type: 'select',      col_order: 3, options: ['High', 'Medium', 'Low'] },
  { name: 'Tags',     type: 'multiselect', col_order: 4, options: [] },
]

export function useTableData(projectId) {
  const { user } = useAuth()
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchColumns = useCallback(async () => {
    if (!projectId) return []
    const { data } = await supabase
      .from('table_columns')
      .select('*')
      .eq('project_id', projectId)
      .order('col_order', { ascending: true })
    return data ?? []
  }, [projectId])

  const fetchRows = useCallback(async () => {
    if (!projectId) return []
    const { data } = await supabase
      .from('table_rows')
      .select('*')
      .eq('project_id', projectId)
      .order('row_order', { ascending: true })
    return data ?? []
  }, [projectId])

  const load = useCallback(async () => {
    if (!projectId || !user) return
    setLoading(true)
    let cols = await fetchColumns()
    // Seed default columns if none exist
    if (cols.length === 0) {
      const toInsert = DEFAULT_COLUMNS.map(c => ({ ...c, project_id: projectId }))
      const { data } = await supabase.from('table_columns').insert(toInsert).select()
      cols = data ?? []
    }
    const rowData = await fetchRows()
    setColumns(cols)
    setRows(rowData)
    setLoading(false)
  }, [projectId, user, fetchColumns, fetchRows])

  useEffect(() => {
    load()
    const colChannel = supabase
      .channel(`tcols-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_columns', filter: `project_id=eq.${projectId}` }, load)
      .subscribe()
    const rowChannel = supabase
      .channel(`trows-${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_rows', filter: `project_id=eq.${projectId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(colChannel); supabase.removeChannel(rowChannel) }
  }, [load, projectId])

  const createColumn = async ({ name, type, options = [] }) => {
    const maxOrder = columns.reduce((m, c) => Math.max(m, c.col_order), -1)
    const { error } = await supabase.from('table_columns').insert({
      project_id: projectId, name, type, col_order: maxOrder + 1, options,
    })
    if (!error) load()
    return { error }
  }

  const updateColumn = async (id, updates) => {
    setColumns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    const { error } = await supabase.from('table_columns').update(updates).eq('id', id)
    if (error) load()
    return { error }
  }

  const deleteColumn = async (id) => {
    setColumns(prev => prev.filter(c => c.id !== id))
    await supabase.from('table_columns').delete().eq('id', id)
  }

  const reorderColumns = async (ordered) => {
    setColumns(ordered)
    for (let i = 0; i < ordered.length; i++) {
      await supabase.from('table_columns').update({ col_order: i }).eq('id', ordered[i].id)
    }
  }

  const createRow = async () => {
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.row_order), -1)
    setRows(prev => [...prev, { id: 'temp-' + Date.now(), project_id: projectId, data: {}, row_order: maxOrder + 1 }])
    const { data, error } = await supabase.from('table_rows').insert({
      project_id: projectId, data: {}, row_order: maxOrder + 1,
    }).select().single()
    if (!error && data) setRows(prev => prev.map(r => r.id.startsWith('temp-') ? data : r))
    else load()
    return { data, error }
  }

  const updateRow = async (id, dataUpdate) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, data: { ...r.data, ...dataUpdate } } : r))
    const row = rows.find(r => r.id === id)
    const merged = { ...(row?.data ?? {}), ...dataUpdate }
    const { error } = await supabase.from('table_rows').update({ data: merged }).eq('id', id)
    if (error) load()
    return { error }
  }

  const deleteRow = async (id) => {
    setRows(prev => prev.filter(r => r.id !== id))
    await supabase.from('table_rows').delete().eq('id', id)
  }

  return { columns, rows, loading, createColumn, updateColumn, deleteColumn, reorderColumns, createRow, updateRow, deleteRow }
}
