/**
 * AppShell — Organism (05.80 AppShell). 3-Zonen-App-Frame: Top-Leiste (AppShellTopbar)
 * + Icon-Rail (AppShellRail) + Content-Outlet, kombiniert in app-shell.root. Ersetzt das
 * frühere Inline-Markup (Slot-Mocks in Stories) durch eine echte Organismus-Komposition.
 *
 * app-shell.content trägt KEIN Padding → der eingesetzte Inhalt (z.B. EntityDetailBase,
 * ebenfalls ohne Padding) füllt den Seiten-Raum (= Desktop − topbar/rail) vollständig.
 * Zonen tragen role-Attribute statt semantischer Struktur-Tags (GF-321-Guard).
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.topbar] - überschreibt die Default-Topbar.
 * @param {string[]} [props.breadcrumb] - Breadcrumb-Segmente für die Default-Topbar
 *   (z.B. ['DevDash', 'Sprint DD#1']). Ohne Angabe greift der AppShellTopbar-Default.
 *   Ignoriert, wenn ein eigenes `topbar` gesetzt ist.
 * @param {import('react').ReactNode} [props.rail] - überschreibt die Default-Rail.
 * @param {string} [props.contentBgClass='bg-[var(--base)]'] - bg-Klasse des Content-Outlets.
 *   Default = base (Canvas); kann auf den App-Hintergrund folgen (z.B. crust), damit das
 *   Outlet farblich mit der App-Fläche verschmilzt statt eine zweite Ebene zu bilden.
 * @param {import('react').ReactNode} props.children - Content-Outlet (die Seite).
 * @param {string} [props.className]
 */
import AppShellTopbar from './AppShellTopbar.jsx'
import AppShellRail from './AppShellRail.jsx'

export default function AppShell({ topbar, rail, contentBgClass = 'bg-[var(--base)]', breadcrumb, children, className = '', ...rest }) {
  return (
    <div
      role="application"
      data-ui="app-shell.root"
      className={`flex h-full flex-col gap-2 ${className}`}
      {...rest}
    >
      {topbar ?? <AppShellTopbar breadcrumb={breadcrumb} />}
      <div className="flex min-h-0 flex-1 gap-2">
        {rail ?? <AppShellRail />}
        {/* Content-Region = struktureller Layout-Slot, KEIN gezeichneter Rahmen
            (PO 2026-06-24): der Inhalt gibt die Struktur, der Außen-Rahmen war
            obsolet → entfernt. Weniger Linien = mehr Klarheit. bg/rounded bleiben
            (Fläche, keine Linie). */}
        <div
          role="main"
          data-ui="app-shell.content"
          className={`min-w-0 flex-1 overflow-auto rounded-[var(--radius-sm)] ${contentBgClass}`}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
