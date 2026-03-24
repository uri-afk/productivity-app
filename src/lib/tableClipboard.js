// Module-level clipboard for tables — persists across note opens within the same session.
// Also writes TSV to the system clipboard for pasting into Excel/Sheets/Numbers.
let _table = null

export const tableClipboard = {
  copy(tableEntry) {
    _table = JSON.parse(JSON.stringify(tableEntry))
  },
  get() { return _table },
  has() { return _table !== null },
  clear() { _table = null },
}
