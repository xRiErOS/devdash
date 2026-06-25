/**
 * FabRadial — Floating-Action-Button mit Radial-Action-Hub (mobile).
 *
 * Cutover der SOLL-Story-Komponente (AppShell.stories.jsx FabButton +
 * RadialActions, F1 DD-633 / FSD T03) in ein echtes Organism. Der FAB ist KEIN
 * Navigations-Hub (das sind die Bottom-Tabs) — er öffnet GENAU 3 kontextuelle
 * Aktionen (D01/D05). PO-abgenommen (project_memory 316): Position unten-rechts,
 * Scrim + vertikal gestapelte Aktions-Reihen. Referenz: Sproutling-FAB (SPF, D06).
 *
 * PRESENTATIONAL: kein react-router, kein Store, kein fetch. Der offen/zu-State
 * (`open`) wird vom Konsumenten gehalten; Klick auf den FAB ruft `onToggle()`,
 * Klick auf den Scrim ebenfalls (schließt). Jede Aktion kommt als
 * `actions=[{ id, label, icon }]`-Prop; Klick ruft `onAction(id)` — der Konsument
 * mappt id→Effekt (Modal/Navigation/Switcher) und schließt selbst.
 *
 * F5 (DD-637): FAB + Aktions-Stack sitzen oberhalb der Bottom-Tab-Bar und
 * respektieren env(safe-area-inset-bottom). Sichtbar `<lg`; ab `lg` kein FAB.
 *
 * @param {object} props
 * @param {boolean} [props.open=false] - Radial-Menü offen
 * @param {()=>void} [props.onToggle] - FAB-/Scrim-Klick (öffnen/schließen)
 * @param {Array<{id:string,label:string,icon?:React.ComponentType<{size?:number}>}>} [props.actions] - 3 Aktionen (Reihenfolge = Render-Reihenfolge)
 * @param {(id:string)=>void} [props.onAction] - Klick/Tap auf eine Aktion
 * @param {string} [props.dataUiScope='app-shell.fab-radial'] - Wurzel-data-ui-bereich
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { Plus, X } from 'lucide-react'

export default function FabRadial({
  open = false,
  onToggle,
  actions = [],
  onAction,
  dataUiScope = 'app-shell.fab-radial',
  className = '',
}) {
  return (
    <div className={`lg:hidden ${className}`}>
      {open && (
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => onToggle?.()}
          data-ui={`${dataUiScope}.scrim`}
          className="fixed inset-0 z-40 devd-anim-fade bg-[color-mix(in_srgb,var(--crust)_55%,transparent)]"
        />
      )}

      {open && (
        <div className="fixed right-4 z-50 flex flex-col items-end gap-3 bottom-[calc(9rem+env(safe-area-inset-bottom))]">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onAction?.(action.id)}
                data-ui={`${dataUiScope}.action.${action.id}`}
                className="flex items-center gap-2 devd-anim-fade"
              >
                <span className="rounded-full px-3 py-1 text-sm font-medium shadow bg-[var(--surface1)] text-[var(--text)]">
                  {action.label}
                </span>
                <span className="flex items-center justify-center w-11 h-11 rounded-full shadow bg-[var(--surface1)] text-[var(--text)]">
                  {Icon ? <Icon size={18} /> : null}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <button
        type="button"
        aria-label={open ? 'Aktionen schließen' : 'Aktionen öffnen'}
        aria-expanded={open}
        onClick={() => onToggle?.()}
        data-ui={`${dataUiScope}.open`}
        className="fixed right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg bg-[var(--accent-primary)] text-[var(--on-accent)] bottom-[calc(5rem+env(safe-area-inset-bottom))]"
      >
        {open ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  )
}
