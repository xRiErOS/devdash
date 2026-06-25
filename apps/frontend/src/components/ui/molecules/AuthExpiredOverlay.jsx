import { LogIn } from 'lucide-react'
import useAuthRequired from '../../../hooks/useAuthRequired.js'

// DD-537 — Globales Overlay bei abgelaufener Authelia-Session.
//
// Wird (in AppShell, oberhalb der Routen) gemountet, damit es auch dann deckt,
// wenn ProjectScope wegen des Auth-Fehlers gar nicht erst seine Kind-Views
// rendert. Reload triggert die Browser-Navigation → Authelia faengt sie ab und
// zeigt die Login-Seite. Greift nur auf auth-gegateten Hosts, weil der Guard in
// apiClient (isAuthGatedHost) das Event dort sonst nicht feuert.
export default function AuthExpiredOverlay() {
  const required = useAuthRequired()
  if (!required) return null

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--crust)_80%,transparent)]"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="auth-expired-title"
      data-ui="auth.expired-overlay"
    >
      <div className="w-full max-w-md rounded-lg border border-[var(--surface1)] bg-[var(--surface0)] p-6 text-center flex flex-col items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface1)] text-[var(--peach)]">
          <LogIn size={24} aria-hidden="true" />
        </span>
        <h2 id="auth-expired-title" className="text-lg font-semibold text-[var(--text)]">
          Session abgelaufen
        </h2>
        <p className="text-sm text-[var(--subtext0)]">
          Du bist nicht (mehr) angemeldet. Bitte melde dich neu an, um
          fortzufahren.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-md bg-[var(--blue)] px-4 py-2 text-sm font-medium text-[var(--crust)] hover:opacity-90"
          data-ui="auth.expired-relogin"
        >
          <LogIn size={16} aria-hidden="true" />
          Neu anmelden
        </button>
      </div>
    </div>
  )
}
