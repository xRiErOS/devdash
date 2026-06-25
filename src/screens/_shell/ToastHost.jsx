// src/screens/_shell/ToastHost.jsx
// Interim: lauscht auf das bestehende 'devd-toast'-CustomEvent (src/lib/toast.js).
// Wird in Task 7 durch das stabile Toast-Molecule (P0.1) ersetzt.
import { useEffect, useState } from 'react'

export function ToastHost() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    function onToast(e) {
      const t = { id: Math.random(), ...e.detail }
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 5000)
    }
    window.addEventListener('devd-toast', onToast)
    return () => window.removeEventListener('devd-toast', onToast)
  }, [])
  return (
    <div data-ui="toast.host" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} data-ui={`toast.${t.kind || 'info'}`}>{t.message}</div>
      ))}
    </div>
  )
}
