import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { setActiveProjectId, setActiveSlug } from '../../lib/projectStore.js'
import ToolHomeScreen from '../../ui/screens/ToolHomeScreen.jsx'

export default function ToolHome() {
  const [projects, setProjects] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)
    fetch('/api/projects')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        if (cancelled) return
        const list = Array.isArray(data) ? data : (data.projects ?? data.rows ?? [])
        setProjects(list)
        setIsLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setIsLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  function handleSelect(slug) {
    const proj = projects.find((p) => p.slug === slug)
    if (proj) {
      setActiveProjectId(proj.id)
      setActiveSlug(proj.slug)
    }
    navigate(`/${slug}/home`)
  }

  return (
    <ToolHomeScreen
      projects={projects}
      isLoading={isLoading}
      error={error}
      onProjectSelect={handleSelect}
      dataUiScope="screen.toolHome.connected"
    />
  )
}
