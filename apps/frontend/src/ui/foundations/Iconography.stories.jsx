/**
 * GF-213 — 01 FOUNDATIONS / Iconography.
 * Katalog des kuratierten Icon-Registry (Single-Source). Jedes Icon trägt
 * Bedeutung; Farbe folgt der Semantik-ROLLE (role → Token, fix). Rollen-Defaults
 * sind ein Vorschlag — PO justiert live im g→d-Review (status:stable).
 * 0 inline-style/Hex; Farben kommen aus ROLE_CLASS (var()-Tokens) via <Icon>.
 */
import Icon from './Icon.jsx'
import { ICON_REGISTRY, ROLES, ROLE_LABEL } from './iconRegistry.js'

const meta = {
  title: '01 FOUNDATIONS/Iconography/Iconography',
  // PO-Freigabe 2026-06-16 (po-review.json: alle 3 ok, project_memory 403).
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

// Rollen-Chips: kleine Token-Chips (outline/neutral, Demo-Ersatz für Pill-Atom).
function RoleChips({ roles }) {
  return (
    <span className="flex flex-wrap gap-1 justify-center">
      {roles.map((r) => (
        <span
          key={r}
          className="text-[10px] text-[var(--subtext0)] border border-[var(--surface1)] rounded px-1 leading-4"
        >{r}</span>
      ))}
    </span>
  )
}

// Cell: Token-Karte (surface0-Hintergrund, Demo-Ersatz für Card-Atom).
function Cell({ name }) {
  const entry = ICON_REGISTRY[name]
  return (
    <div
      data-ui={`fnd.iconography.item.${name}`}
      className="flex flex-col items-center gap-1 text-center bg-[var(--surface0)] rounded-lg p-2"
    >
      <Icon name={name} size={24} mono />
      <span className="text-[11px] text-[var(--text)]">{name}</span>
      <span className="text-[10px] text-[var(--subtext0)]">{entry.label}</span>
      <RoleChips roles={entry.roles} />
    </div>
  )
}

const KEYS = Object.keys(ICON_REGISTRY)

// Default = vollständiger Katalog (Baseline-Render, Konvention).
export const Default = {
  name: 'Catalog',
  render: () => (
    <div
      data-ui="fnd.iconography.catalog"
      className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(110px,1fr))]"
    >
      {KEYS.map((k) => <Cell key={k} name={k} />)}
    </div>
  ),
}

// Rollen-Farben: ein Repräsentant je Rolle, zeigt das fixe role→Token-Mapping.
const ROLE_SAMPLE = {
  neutral: 'settings',
  primary: 'add',
  success: 'success',
  danger: 'error',
  warning: 'alert',
  info: 'info',
}
export const Roles = {
  render: () => (
    <div data-ui="fnd.iconography.roles" className="flex flex-wrap gap-4">
      {ROLES.map((r) => (
        <div key={r} data-ui={`fnd.iconography.role.${r}`} className="flex flex-col items-center gap-1">
          <Icon name={ROLE_SAMPLE[r]} role={r} size={28} />
          <span className="text-[11px] text-[var(--text)]">{ROLE_LABEL[r]}</span>
          <span className="text-[10px] text-[var(--subtext0)]">{r}</span>
        </div>
      ))}
    </div>
  ),
}

// Mehrrollig: dasselbe Icon, Rolle pro Verwendung (Gehirn.gut=grün, .schlecht=rot).
export const MultiRole = {
  name: 'Multi-Role (Brain)',
  render: () => (
    <div data-ui="fnd.iconography.multirole" className="flex gap-6">
      {['neutral', 'success', 'danger'].map((r) => (
        <div key={r} data-ui={`fnd.iconography.multirole.${r}`} className="flex flex-col items-center gap-1">
          <Icon name="brain" role={r} size={32} />
          <span className="text-[11px] text-[var(--text)]">brain · {r}</span>
        </div>
      ))}
    </div>
  ),
}
