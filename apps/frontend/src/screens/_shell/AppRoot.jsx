// src/screens/_shell/AppRoot.jsx
// Boot-Einstieg: resolveView() entscheidet app-shell vs capture vs unknown-banner.
// installApiClient() wird in main.jsx VOR dem Render aufgerufen (Side-Effect, kein Render).
import { Suspense } from 'react'
import { BrowserRouter, MemoryRouter, Routes } from 'react-router-dom'
import { Providers } from './Providers.jsx'
import { buildRoutes } from './routes.jsx'
import { resolveView, VIEW_APP_SHELL, UNKNOWN_HOST_FALLBACK } from '../../lib/hostnameRouter.js'

function RouteFallback() { return <div data-ui="boot.loading">…</div> }

// Testbarer Shell-View (MemoryRouter, kein window). forceBanner simuliert unknown host.
export function AppShellView({ initialPath = '/', forceBanner = false }) {
  return (
    <Providers>
      {forceBanner && <div data-ui="boot.unknown-host-banner">Unbekannter Host</div>}
      <MemoryRouter initialEntries={[initialPath]}>
        <Suspense fallback={<RouteFallback />}>
          <Routes>{buildRoutes()}</Routes>
        </Suspense>
      </MemoryRouter>
    </Providers>
  )
}

// Produktiver Einstieg (window-gebunden).
export function AppRoot() {
  const { view } = resolveView(window.location.hostname, window.location.search, window.location.pathname)
  const showBanner = view !== VIEW_APP_SHELL && UNKNOWN_HOST_FALLBACK === VIEW_APP_SHELL
  // Capture-View bleibt vorerst beim bestehenden Boot (separater Pfad) — hier nur App-Shell.
  return (
    <Providers>
      {showBanner && <div data-ui="boot.unknown-host-banner">Unbekannter Host</div>}
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>{buildRoutes()}</Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  )
}
