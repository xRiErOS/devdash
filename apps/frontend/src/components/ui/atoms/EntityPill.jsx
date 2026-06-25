import { Map as MapIcon, CircleCheckBig, ListChecks, ChevronsRight, NotepadText } from 'lucide-react'

/**
 * EntityPill — kanonische Entitäts-Pille (PO 2026-06-16, D-pill-badge-taxonomy).
 * Konsolidiert SprintPill / IssuePill / MilestonePill in EINE Wahrheit (DD-481).
 *
 * Content-Shape: ID / ID+Name / Name (id + optionaler name, showName steuert).
 * Appearance: `entity` (sprint|issue|milestone|dod|todo|neutral) → Akzentfarbe +
 * optional Icon. `color` überschreibt die entity-Farbe explizit.
 * Render-Modus: href → <a>, sonst onClick → <button> (drag-sicher), sonst <span>.
 * Props-driven, kein Store/Fetch, keine Domänen-Logik (Strings kommen als Props).
 *
 * @param {object} props
 * @param {string} [props.id] - ID-Key (z.B. "DD-42").
 * @param {string} [props.name] - Klartext-Name rechts vom Key.
 * @param {boolean} [props.showName=true] - false → nur ID.
 * @param {'sprint'|'issue'|'milestone'|'dod'|'todo'|'neutral'} [props.entity='neutral']
 * @param {'primary'|'success'|'danger'|'warning'|'info'|'neutral'} [props.color] - Farb-Override
 * @param {string} [props.href] - gesetzt → <a>.
 * @param {(e:any)=>void} [props.onClick] - gesetzt (ohne href) → <button>, drag-sicher.
 * @param {'sm'|'md'} [props.size='md']
 * @param {string} [props.title] - Tooltip-Override (default "<id> — <name>").
 * @param {string} [props.className]
 */
const COLOR = {
  primary: 'text-[var(--accent-primary)] border-[var(--accent-primary)]',
  success: 'text-[var(--accent-success)] border-[var(--accent-success)]',
  danger: 'text-[var(--accent-danger)] border-[var(--accent-danger)]',
  warning: 'text-[var(--accent-warning)] border-[var(--accent-warning)]',
  info: 'text-[var(--accent-info)] border-[var(--accent-info)]',
  neutral: 'text-[var(--subtext0)] border-[var(--surface2)]',
}

// Entität → Default-Farbe + optionales Appearance-Icon.
const ENTITY = {
  sprint: { color: 'primary', icon: ChevronsRight },
  issue: { color: 'info', icon: NotepadText },
  milestone: { color: 'info', icon: MapIcon },
  dod: { color: 'success', icon: CircleCheckBig },
  todo: { color: 'warning', icon: ListChecks },
  neutral: { color: 'neutral', icon: null },
}

const SIZE = {
  sm: 'text-[11px] ps-2 pe-2 py-0.5',
  md: 'text-[13px] ps-2.5 pe-2.5 py-1',
}

export default function EntityPill({
  id,
  name = '',
  showName = true,
  entity = 'neutral',
  color,
  href,
  onClick,
  size = 'md',
  title,
  className = '',
  ...rest
}) {
  if (!id && !name) return null

  const appearance = ENTITY[entity] || ENTITY.neutral
  const colorClasses = COLOR[color || appearance.color] || COLOR.neutral
  const sizeClasses = SIZE[size] || SIZE.md
  const EntityIcon = appearance.icon

  const fullLabel = id && name ? `${id} — ${name}` : (id || name)
  const tooltip = title ?? fullLabel

  const baseClasses =
    'inline-flex items-center gap-1.5 max-w-full min-w-0 rounded-full font-bold ' +
    'whitespace-nowrap bg-transparent border ' +
    'font-[var(--font-display,JetBrains_Mono,ui-monospace,monospace)] ' +
    `${sizeClasses} ${colorClasses} ${className}`

  const content = (
    <>
      {EntityIcon && <EntityIcon data-ui="entity-pill.icon" size={size === 'sm' ? 11 : 13} aria-hidden="true" className="shrink-0" />}
      {id && (
        <span data-ui="entity-pill.value" className="shrink-0">{id}</span>
      )}
      {id && showName && name && (
        <span data-ui="entity-pill.separator" aria-hidden="true" className="shrink-0 opacity-55">—</span>
      )}
      {showName && name && (
        <span data-ui="entity-pill.label" className="overflow-hidden text-ellipsis whitespace-nowrap min-w-0">{name}</span>
      )}
    </>
  )

  if (href) {
    return (
      <a data-ui="entity-pill" href={href} className={`${baseClasses} cursor-pointer no-underline`} title={tooltip} aria-label={fullLabel} {...rest}>
        {content}
      </a>
    )
  }

  if (typeof onClick === 'function') {
    // Drag-sicher: Klick/PointerDown stoppen Propagation, damit Container-Drag
    // (dnd-kit) nicht als Drag-Start feuert — Verhalten aus MilestonePill übernommen.
    const handleClick = (e) => { e.stopPropagation(); onClick(e) }
    const handlePointerDown = (e) => { e.stopPropagation() }
    return (
      <button type="button" data-ui="entity-pill" className={`${baseClasses} cursor-pointer`} title={tooltip} aria-label={fullLabel} onClick={handleClick} onPointerDown={handlePointerDown} {...rest}>
        {content}
      </button>
    )
  }

  return (
    <span data-ui="entity-pill" className={baseClasses} title={tooltip} aria-label={fullLabel} {...rest}>
      {content}
    </span>
  )
}
