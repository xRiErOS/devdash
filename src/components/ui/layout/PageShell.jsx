// src/components/ui/layout/PageShell.jsx
import Stack from './Stack.jsx'
import Sidebar from './Sidebar.jsx'
/**
 * PageShell — einheitlicher Content-Rahmen INNERHALB der AppShell-Outlet
 * (die globale Chrome/Nav bleibt Layout.jsx). Begrenzt Breite, setzt Padding,
 * rendert optionalen View-Titel. Macht alle Views außenbündig konsistent.
 *
 * Slot-Vertrag (DD-415, verbindlich):
 *  - title   (string)            → View-Überschrift, linksbündig im Header.
 *  - actions (ReactNode)         → rechtsbündige Header-Aktionen.
 *  - sidebar (ReactNode)         → optionale Detail-Spalte; gesetzt ⇒ 2-spaltig.
 *  - content (ReactNode)         → Hauptinhalt.
 *  - children (ReactNode)        → RÜCKWÄRTSKOMPAT: dient als content-Fallback
 *                                  (content ?? children), wenn content fehlt.
 *
 * @param {object} props
 * @param {string} [props.title]
 * @param {React.ReactNode} [props.actions] - rechtsbündige Header-Aktionen
 * @param {React.ReactNode} [props.sidebar] - optionale Detail-Spalte (Master-Detail)
 * @param {React.ReactNode} [props.content] - Hauptinhalt (bevorzugt vor children)
 * @param {boolean} [props.sidebarRight=false] - Detail-Spalte rechts statt links
 * @param {'md'|'lg'|'full'} [props.width='lg']
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children] - content-Fallback (Back-Compat)
 */
export default function PageShell({ title, actions, sidebar, content, sidebarRight = false, width = 'lg', className = '', children }) {
  const maxW = { md: 'max-w-3xl', lg: 'max-w-6xl', full: 'max-w-none' }[width] || 'max-w-6xl'
  const body = content ?? children
  const main = <Stack gap="md">{body}</Stack>
  return (
    <div className={`${maxW} mx-auto w-full px-4 py-4 ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h1 className="text-lg font-semibold text-[var(--text)]">{title}</h1>}
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {sidebar ? (
        <Sidebar side={sidebar} sideRight={sidebarRight} gap="md">{main}</Sidebar>
      ) : (
        main
      )}
    </div>
  )
}
