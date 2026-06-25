import { useEffect, useState } from 'react'

const DEFAULTS = { archon_enabled: false }

let cached = null
let inflight = null

export function useFeatureFlags() {
  const [flags, setFlags] = useState(cached || DEFAULTS)

  useEffect(() => {
    if (cached) { setFlags(cached); return }
    if (!inflight) {
      inflight = fetch('/api/config')
        .then(r => r.ok ? r.json() : DEFAULTS)
        .then(j => { cached = { ...DEFAULTS, ...j }; return cached })
        .catch(() => { cached = DEFAULTS; return cached })
    }
    let alive = true
    inflight.then(c => { if (alive) setFlags(c) })
    return () => { alive = false }
  }, [])

  return flags
}
