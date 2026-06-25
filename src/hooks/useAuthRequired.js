import { useState, useEffect } from 'react'
import { isAuthRequired } from '../lib/authGuard.js'

// DD-537 — React-Bindung an den zentralen Auth-Guard. Liefert true, sobald
// apiClient einen Auth-Fehler (abgelaufene Authelia-Session) erkannt hat.
export default function useAuthRequired() {
  const [required, setRequired] = useState(isAuthRequired())

  useEffect(() => {
    if (isAuthRequired()) {
      setRequired(true)
      return
    }
    const handler = () => setRequired(true)
    window.addEventListener('devd-auth-required', handler)
    return () => window.removeEventListener('devd-auth-required', handler)
  }, [])

  return required
}
