// DD-227 / DD-248: Hostname-basiertes Code-Split.
//
// Die eigentliche Hostname→View-Auflösung lebt in src/lib/hostnameRouter.js
// (pure Funktion, vitest-testbar). main.jsx ist nur noch der Bootstrap:
// - resolveView() einmal beim Modul-Laden ausführen
// - passende lazy()-View rendern, mit Suspense-Splash
// - bei unbekanntem Host: konfigurierten Fallback + sichtbaren Banner zeigen
//
// Wichtig: der Aufruf von resolveView() steht AUSSERHALB der lazy()-Callbacks,
// damit Vite die Chunks getrennt splitten kann (siehe DD-227 / Vite Issue
// #16350). Wir importieren beide View-Module via lazy(), aber nur die zur
// aktuellen Host-Entscheidung passende wird beim Mount tatsächlich geladen.
import React, { lazy, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { installApiClient } from './lib/apiClient'
import {
  resolveView,
  VIEW_APP_SHELL,
  VIEW_CAPTURE,
  VIEW_CAPTURE_PINNED,
  VIEW_UNKNOWN,
  UNKNOWN_HOST_FALLBACK,
  UNKNOWN_HOST_SHOW_BANNER,
} from './lib/hostnameRouter.js'

// GF-2 P0.2: app-shell view now boots the new shell (AppRoot brings its own Router + Providers).
// Strangler bridge — old ./views/AppShell.jsx stays in the tree (still imported by nothing else / harvested by C4).
const AppShell = lazy(() => import('./screens/_shell/AppRoot.jsx').then((m) => ({ default: m.AppRoot })))
// Clean-Cut (DD2): CaptureView (src/views/) entfernt — Platzhalter bis Promote aus Storybook.
function CaptureView({ pinnedSlug }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif', color: 'var(--subtext0)' }}>
      Capture-View — wird aus dem Storybook-Katalog promotet{pinnedSlug ? ` (${pinnedSlug})` : ''}
    </div>
  )
}

installApiClient()

const decision =
  typeof window !== 'undefined'
    ? resolveView(window.location.hostname, window.location.search, window.location.pathname)
    : { view: UNKNOWN_HOST_FALLBACK, source: 'no-window', hostname: '' }

function SplashFallback() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--base)',
        color: 'var(--blue)',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '14px',
      }}
    >
      lade…
    </div>
  )
}

function UnknownHostBanner({ hostname }) {
  return (
    <div
      role="alert"
      style={{
        background: 'var(--red)',
        color: 'var(--on-accent)',
        padding: '8px 16px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '13px',
        textAlign: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 9999,
      }}
    >
      Unbekannter Hostname „{hostname || 'unknown'}“ — zeige Fallback-Ansicht
      (AppShell). Wenn das ein neuer offizieller Host ist, in
      <code style={{ margin: '0 4px' }}>src/lib/hostnameRouter.js</code>
      zur Whitelist hinzufügen.
    </div>
  )
}

// Explizite Switch-Map: Hostname-Decision → konkretes JSX. Kein impliziter
// Default-Branch — jeder Case ist benannt.
function renderForDecision(view, pinnedSlug) {
  switch (view) {
    case VIEW_APP_SHELL:
      return <AppShell />
    case VIEW_CAPTURE:
      return <CaptureView />
    case VIEW_CAPTURE_PINNED:
      return <CaptureView pinnedSlug={pinnedSlug} />
    case VIEW_UNKNOWN:
      return UNKNOWN_HOST_FALLBACK === VIEW_CAPTURE ? <CaptureView /> : <AppShell />
    default:
      // Defensiv: sollte unerreichbar sein — wenn doch, sichtbar machen
      // (nicht still schlucken).
      return (
        <div style={{ padding: 24, color: 'var(--red)' }}>
          Boot-Fehler: unbekannter View-Identifier „{String(view)}“
        </div>
      )
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    {decision.view === VIEW_UNKNOWN && UNKNOWN_HOST_SHOW_BANNER && (
      <UnknownHostBanner hostname={decision.hostname} />
    )}
    <Suspense fallback={<SplashFallback />}>{renderForDecision(decision.view, decision.slug)}</Suspense>
  </>
)
