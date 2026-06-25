/**
 * AppShellTopbar — Organism (05.80 AppShell). Top-Leiste: Quick-Switcher-Trigger
 * (DD-Logo) + Breadcrumb links, globale Suche + Shortcuts-Hilfe + Theme rechts.
 * Präsentational, vollständig controlled/props-driven. Orchestrierung (State,
 * Handler) liegt im Container (`useShell`, R6) — die Topbar ruft nur Callbacks.
 *
 * data-ui="app-shell.topbar" (Wrapper). Trägt role="banner" statt Struktur-Tag
 * (GF-321-Guard). GF-2-Anker (C4 SOLL, Schritt 5): app-shell.topbar.{quick-switcher,
 * search,shortcuts,theme-toggle}. Breadcrumb bleibt bewusst component-only (Leaf-
 * Konvention, kein data_ui-Anker — C4-Entscheid 2026-06-24).
 *
 * Terminal-Design (EntityDetail V2): mono (`--font-display`), border-driven, scharf,
 * theme-aware, 0 Roh-Hex. Kanonisch (EIN Entwurf — die 3 draftVersion-Explorationen
 * sind nach PO-Wahl + Mockup-Verdrahtung kollabiert).
 *
 * @param {object} props
 * @param {string[]} [props.breadcrumb] - Pfad-Segmente (erstes = home, letztes = aktiv).
 * @param {'light'|'dark'} [props.theme='dark'] - steuert das Theme-Toggle-Icon (Sun/Moon).
 * @param {string} [props.searchValue] - controlled Suchbegriff.
 * @param {(e:any)=>void} [props.onSearchChange]
 * @param {()=>void} [props.onSearchClear]
 * @param {(value:string)=>void} [props.onSearchSubmit]
 * @param {()=>void} [props.onQuickSwitcher] - DD-Logo / Taste q.
 * @param {()=>void} [props.onShortcuts] - Hilfe-Icon / Taste ?.
 * @param {()=>void} [props.onThemeToggle]
 * @param {string} [props.searchPlaceholder='Suchen…']
 * @param {string} [props.className]
 */
import { CircleHelp, Sun, Moon } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'
import DDLogo from '../atoms/DDLogo.jsx'
import Breadcrumb from '../molecules/Breadcrumb.jsx'
import SearchField from '../molecules/SearchField.jsx'

export default function AppShellTopbar({
  breadcrumb = ['DevDash'],
  theme = 'dark',
  searchValue = '',
  searchPlaceholder = 'Suchen…',
  onSearchChange,
  onSearchClear,
  onSearchSubmit,
  onQuickSwitcher,
  onShortcuts,
  onThemeToggle,
  className = '',
  ...rest
}) {
  // Segmente → Breadcrumb-Molecule-Items (erstes = home, letztes = aktiv/non-link).
  const crumbItems = breadcrumb.map((label, i) => ({ key: `${i}-${label}`, label, home: i === 0 }))

  return (
    <div
      role="banner"
      data-ui="app-shell.topbar"
      className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-sm)] border border-[var(--surface1)] bg-[var(--mantle)] px-3 py-2 [font-family:var(--font-display)] ${className}`}
      {...rest}
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* QuickSwitcher-Trigger = DevDash-Logo (PO-Kanon, ersetzt LayoutDashboard). */}
        <DDLogo onClick={onQuickSwitcher} label="Quick-Switcher (q)" data-ui="app-shell.topbar.quick-switcher" />
        <Breadcrumb items={crumbItems} />
      </div>
      <div className="flex items-center gap-3">
        <form
          className="w-56"
          data-ui="app-shell.topbar.search"
          onSubmit={(e) => {
            e.preventDefault()
            onSearchSubmit?.(searchValue)
          }}
        >
          <SearchField value={searchValue} onChange={onSearchChange} onClear={onSearchClear} placeholder={searchPlaceholder} />
        </form>
        <IconButton
          icon={<CircleHelp size={18} />}
          label="Shortcuts (?)"
          variant="ghost"
          onClick={onShortcuts}
          data-ui="app-shell.topbar.shortcuts"
        />
        <IconButton
          icon={theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          label="Theme wechseln"
          variant="ghost"
          onClick={onThemeToggle}
          data-ui="app-shell.topbar.theme-toggle"
        />
      </div>
    </div>
  )
}
