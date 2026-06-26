// src/screens/_shell/ToastHost.jsx
// Dünner Host um das Toast-Organism (src/ui/organisms/complex/Toast.jsx). Lauscht
// auf das 'devd-toast'-CustomEvent (interim) und stapelt flüchtige Toasts unten
// rechts. SSR-safe: addEventListener sitzt im useEffect (läuft im Render-Smoke nicht).
import { useEffect, useState } from 'react'
import Toast from '../../ui/organisms/complex/Toast.jsx'

export function ToastHost() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    let seq = 0
    function onToast(e) {
      const id = `t${seq++}`
      const t = { id, kind: e.detail?.kind || 'success', message: e.detail?.message || '' }
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 5000)
    }
    window.addEventListener('devd-toast', onToast)
    return () => window.removeEventListener('devd-toast', onToast)
  }, [])

  return (
    <div
      data-ui="app-shell.toast-host"
      aria-live="polite"
      className="fixed bottom-[var(--space-4)] right-[var(--space-4)] z-50 flex flex-col gap-[var(--space-2)] items-end"
    >
      {toasts.map((t) => (
        <Toast key={t.id} kind={t.kind} message={t.message} />
      ))}
    </div>
  )
}
