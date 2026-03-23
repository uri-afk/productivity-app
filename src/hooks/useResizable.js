import { useState, useEffect, useRef } from 'react'

// flip=false (default): drag left handle LEFT → wider  (right-side panels)
// flip=true:            drag right handle RIGHT → wider (main content area)
export function useResizable({ minWidth = 280, maxWidth = 960, defaultWidth = 420, flip = false }) {
  const [width, setWidth] = useState(defaultWidth)
  const s = useRef({ dragging: false, startX: 0, startW: 0, width: defaultWidth, min: minWidth, max: maxWidth, flip })
  s.current.width = width
  s.current.min = minWidth
  s.current.max = maxWidth
  s.current.flip = flip

  useEffect(() => {
    function onMove(e) {
      if (!s.current.dragging) return
      const delta = s.current.flip
        ? e.clientX - s.current.startX   // drag right = wider
        : s.current.startX - e.clientX   // drag left  = wider
      setWidth(Math.min(s.current.max, Math.max(s.current.min, s.current.startW + delta)))
    }
    function onUp() {
      s.current.dragging = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [])

  function startResize(e) {
    e.preventDefault()
    s.current.dragging = true
    s.current.startX = e.clientX
    s.current.startW = s.current.width
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'
  }

  return { width, startResize }
}
