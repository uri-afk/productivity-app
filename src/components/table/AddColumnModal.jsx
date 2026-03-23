import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

const COLUMN_TYPES = [
  { id: 'text',        label: 'Text',         desc: 'Plain text'           },
  { id: 'number',      label: 'Number',       desc: 'Numeric value'        },
  { id: 'date',        label: 'Date',         desc: 'Date picker'          },
  { id: 'url',         label: 'URL',          desc: 'Clickable link'       },
  { id: 'checkbox',    label: 'Checkbox',     desc: 'True / false'         },
  { id: 'select',      label: 'Select',       desc: 'Single choice'        },
  { id: 'multiselect', label: 'Multi-select', desc: 'Multiple tags'        },
]

export default function AddColumnModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('text')
  const [options, setOptions] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const opts = (type === 'select' || type === 'multiselect')
      ? options.split(',').map(s => s.trim()).filter(Boolean)
      : []
    await onCreate({ name: name.trim(), type, options: opts })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Add column</h3>
          <button onClick={onClose} className="p-1.5 rounded text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Column name</label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Column name…"
              className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {COLUMN_TYPES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    'flex flex-col items-start px-3 py-2 rounded-lg border text-left transition-colors',
                    type === t.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  )}
                >
                  <span className="text-xs font-medium text-slate-900 dark:text-white">{t.label}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {(type === 'select' || type === 'multiselect') && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Options (comma-separated)</label>
              <input
                value={options}
                onChange={e => setOptions(e.target.value)}
                placeholder="Option 1, Option 2, Option 3"
                className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">Add column</button>
          </div>
        </form>
      </div>
    </div>
  )
}
