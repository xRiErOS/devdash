import { useEffect, useState } from 'react'

export function useArchonRunStream(runId) {
  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('idle') // idle | connecting | streaming | ended | error

  useEffect(() => {
    if (!runId) {
      setEvents([])
      setStatus('idle')
      return
    }
    setEvents([])
    setStatus('connecting')
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    const ws = new WebSocket(`${proto}//${location.host}/ws/archon/${encodeURIComponent(runId)}`)
    ws.onopen = () => setStatus('streaming')
    ws.onmessage = e => {
      try {
        const evt = JSON.parse(e.data)
        setEvents(prev => [...prev, evt])
      } catch {}
    }
    ws.onclose = () => setStatus('ended')
    ws.onerror = () => setStatus('error')
    return () => ws.close()
  }, [runId])

  return { events, status }
}
