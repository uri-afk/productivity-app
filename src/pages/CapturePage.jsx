import { useEffect } from 'react'
import { useSearchParams, useNavigate, useOutletContext } from 'react-router-dom'

export default function CapturePage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { openCapture } = useOutletContext()

  useEffect(() => {
    const type = params.get('type') === 'note' ? 'note' : 'task'
    const projectName = params.get('project') ?? null
    openCapture({ type, projectName })
    navigate('/dashboard', { replace: true })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
