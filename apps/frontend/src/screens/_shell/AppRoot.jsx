// src/screens/_shell/AppRoot.jsx
// Boot-Einstieg der App-Shell. installApiClient() wird in main.jsx VOR dem Render
// aufgerufen (Side-Effect). resolveView() hat im Boot bereits app-shell entschieden;
// hier zeigt AppRoot nur die Shell (Capture-View hat einen eigenen Boot-Pfad).
import { Suspense } from 'react'
import { BrowserRouter, MemoryRouter, Routes } from 'react-router-dom'
import { Providers } from './Providers.jsx'
import { buildRoutes } from './routes.jsx'

function RouteFallback() {
  return <div data-ui="boot.loading">…</div>
}

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
  return (
    <Providers>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>{buildRoutes()}</Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  )
}
