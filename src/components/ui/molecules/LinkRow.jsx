/**
 * LinkRow — DD#61 Molecule (extract aus projectHome/TodoLinksList.jsx · LinkRow).
 * Eine Zeile einer Link-Liste: farbiges Typ-Icon (../atoms/TypeIcon) + Label + Typ-Tag
 * + optionaler Remove-Button (../atoms/IconButton). Props-driven, kein Store/Fetch,
 * kein Todo-/Issue-State. Wird `href` gesetzt, ist das Label ein klickbarer Link,
 * sonst reiner Text. Komponiert ≥2 Atoms → Molecule.
 *
 * @param {object} props
 * @param {'spec'|'issue'|'vault'|'url'|string} props.type - Link-Typ → Icon/Farbe + Typ-Tag
 * @param {string} props.label - Anzeigetext der Zeile
 * @param {string} [props.href] - wenn gesetzt: Label wird klickbarer <a>
 * @param {() => void} [props.onRemove] - wenn gesetzt: Remove-Button rechts
 * @param {string} [props.className]
 */
import { X } from 'lucide-react'
import TypeIcon from '../atoms/TypeIcon.jsx'
import IconButton from '../atoms/IconButton.jsx'

export default function LinkRow({ type, label, href, onRemove, className = '' }) {
  return (
    <li
      data-ui="link-row"
      data-link-type={type}
      className={`flex items-center gap-2.5 px-2.5 py-2 mb-1.5 rounded-md border border-[var(--surface0)] bg-[var(--surface0)] font-mono text-xs hover:border-[var(--accent-primary)] ${className}`}
    >
      <TypeIcon type={type} />
      {href ? (
        <a
          href={href}
          rel="noreferrer"
          data-ui="link-row.label"
          title={label}
          className="flex-1 min-w-0 text-left text-[var(--text)] break-all hover:text-[var(--accent-primary)] hover:underline"
        >
          {label}
        </a>
      ) : (
        <span
          data-ui="link-row.label"
          title={label}
          className="flex-1 min-w-0 text-left text-[var(--text)] break-all"
        >
          {label}
        </span>
      )}
      <span data-ui="link-row.tag" className="shrink-0 text-[10px] uppercase tracking-wide text-[var(--subtext0)]">
        {type}
      </span>
      {onRemove ? (
        <IconButton
          icon={<X size={13} aria-hidden />}
          label="Link entfernen"
          onClick={onRemove}
          size="sm"
          variant="ghost"
          className="shrink-0"
        />
      ) : null}
    </li>
  )
}
