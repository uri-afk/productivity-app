// Module-level clipboard for tables — persists across note opens within the same session.
// Also writes TSV to the system clipboard for pasting into Excel/Sheets/Numbers.
let _table = null
const _listeners = new Set()

export const tableClipboard = {
  copy(tableEntry) {
    _table = JSON.parse(JSON.stringify(tableEntry))
    _listeners.forEach(fn => fn(true))
  },
  get() { return _table },
  has() { return _table !== null },
  subscribe(fn) {
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  },
}
