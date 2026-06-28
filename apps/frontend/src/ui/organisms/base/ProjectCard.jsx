/**
 * ProjectCard — Einzel-Projekt-Karte für den ToolHome-Grid.
 * Vollständig als `<button>` (Spec §7 Accessibility). Farbbalken oben via
 * Catppuccin-Token-Map (Tailwind-safe: alle Klassen als Literale).
 *
 * @param {object} props
 * @param {{id:number,slug:string,name:string,prefix:string,color:string,description?:string|null,sprint_count?:number,backlog_count?:number,active_sprint?:{name:string}|null,archived:number}} props.project
 * @param {(slug:string)=>void} props.onSelect
 * @param {string} [props.dataUiScope='organism.projectCard']
 */

import Badge from '../../atoms/Badge.jsx'

// Tailwind v4: alle Klassen als vollständige Literale → korrekt gescannt.
const ACCENT_BG = {
  rosewater: 'bg-[var(--ctp-rosewater)]',
  flamingo:  'bg-[var(--ctp-flamingo)]',
  pink:      'bg-[var(--ctp-pink)]',
  mauve:     'bg-[var(--ctp-mauve)]',
  red:       'bg-[var(--ctp-red)]',
  maroon:    'bg-[var(--ctp-maroon)]',
  peach:     'bg-[var(--ctp-peach)]',
  yellow:    'bg-[var(--ctp-yellow)]',
  green:     'bg-[var(--ctp-green)]',
  teal:      'bg-[var(--ctp-teal)]',
  sky:       'bg-[var(--ctp-sky)]',
  sapphire:  'bg-[var(--ctp-sapphire)]',
  blue:      'bg-[var(--ctp-blue)]',
  lavender:  'bg-[var(--ctp-lavender)]',
}

export default function ProjectCard({
  project,
  onSelect,
  dataUiScope = 'organism.projectCard',
}) {
  const {
    slug,
    name,
    prefix,
    color,
    description = null,
    sprint_count = 0,
    backlog_count = 0,
    active_sprint = null,
  } = project

  const accentBg = ACCENT_BG[color] ?? 'bg-[var(--overlay0)]'

  const ariaLabel = [
    `Projekt ${prefix}, ${name}`,
    `${sprint_count} Sprint${sprint_count !== 1 ? 's' : ''}`,
    `${backlog_count} Backlog-Einträge`,
    active_sprint ? `aktiver Sprint: ${active_sprint.name}` : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      data-ui={dataUiScope}
      onClick={() => onSelect(slug)}
      aria-label={ariaLabel}
      className="text-left flex flex-col min-h-[196px] w-full rounded-md border border-[var(--surface0)] bg-[var(--base)] hover:border-[var(--surface1)] shadow-[var(--shadow-card)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)] transition-colors overflow-hidden"
    >
      {/* Farbbalken */}
      <div
        data-ui={`${dataUiScope}.accent`}
        aria-hidden="true"
        className={`h-[3px] w-full flex-shrink-0 ${accentBg}`}
      />

      <div className="flex-1 flex flex-col gap-[var(--space-2)] p-[var(--space-3)]">
        {/* Header: PrefixBadge + Name */}
        <div data-ui={`${dataUiScope}.header`} className="flex items-center gap-[var(--space-2)]">
          <Badge tone="muted" size="sm" mono dataUiScope={`${dataUiScope}.prefix`} className="flex-shrink-0 text-[10px] font-semibold">
            {prefix}
          </Badge>
          <span
            data-ui={`${dataUiScope}.name`}
            className="[font-family:var(--font-display)] text-[14px] font-semibold text-[var(--text)] truncate"
          >
            {name}
          </span>
        </div>

        {/* Description (bedingt, D08) */}
        {description && (
          <p
            data-ui={`${dataUiScope}.description`}
            className="[font-family:var(--font-display)] text-[12px] leading-snug text-[var(--subtext0)] line-clamp-2"
          >
            {description}
          </p>
        )}

        <div className="flex-1" />

        {/* Meta: Sprint-Count · Backlog-Count · ActiveSprintChip */}
        <div data-ui={`${dataUiScope}.meta`} className="flex flex-wrap items-center gap-[var(--space-1)]">
          <Badge tone="neutral">{sprint_count} Sprint{sprint_count !== 1 ? 's' : ''}</Badge>
          <Badge tone="neutral">{backlog_count} Backlog</Badge>
          {active_sprint && (
            <Badge tone="accent" dataUiScope={`${dataUiScope}.active-sprint`}>
              {active_sprint.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Footer: Öffnen-CTA (visuell, Card ist vollständiger Button) */}
      <div data-ui={`${dataUiScope}.footer`} className="flex items-center justify-end px-[var(--space-3)] pb-[var(--space-3)]">
        <span
          data-ui={`${dataUiScope}.cta`}
          aria-hidden="true"
          className="[font-family:var(--font-display)] text-[12px] font-medium text-[var(--accent-primary)]"
        >
          Öffnen →
        </span>
      </div>
    </button>
  )
}
