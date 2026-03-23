import { useState, useRef, useCallback } from 'react'

export function useResizable({ minWidth = 280, maxWidth = 960, defaultWidth = 420 }) {
  const [width, setWidth] = useState(defaultWidth)
  // Use a ref so the callback doesn't need to be recreated on every width change
  const stateRef = useRef({ width, minWidth, maxWidth })
  stateRef.current = { width, minWidth, maxWidth }

  // Bind this to onPointerDown on the resize handle element
  const startResize = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()

    const { width: startW, minWidth: min, maxWidth: max } = stateRef.current
    const startX = e.clientX
    const el = e.currentTarget

    // Pointer capture routes all pointer events to this element even outside bounds
    el.setPointerCapture(e.pointerId)

    function onMove(ev) {
      const delta = startX - ev.clientX  // drag left → wider (right-side panel)
      setWidth(Math.min(max, Math.max(min, startW + delta)))
    }

    function onUp() {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
  }, [])  // stable — reads current values via ref

  return { width, startResize }
}
