// DD-283 R4 (M3-S02 T03): Links-Liste 1:1 aus DD39-Mockup (.links-list/.link-item Z.693-711).
// link-item: base-bg, surface0-border, radius 6, Mono 12. Farbiges 14px-Typ-Icon (spec→peach,
// issue→blue, vault→mauve, url→green) statt Vollfarbe-Text-Badge. Issue-Links KLICKBAR →
// onOpenIssue(key) (navigate /issues/<id>) mit peach-Hover (sprint-key-Logik). Remove je Item.

import { useState } from 'react'

const TYPE_COLORS = {
  spec: 'var(--peach)',
  issue: 'var(--blue)',
  vault: 'var(--mauve)',
  url: 'var(--green)',
}

const TYPE_ICONS = {
  spec: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  issue: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  vault: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  url: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
}

function TypeIcon({ type }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke={TYPE_COLORS[type] || 'var(--overlay1)'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {TYPE_ICONS[type]}
    </svg>
  )
}

// DD-340: extrahiert den decodierten `file=`-Note-Namen aus einer obsidian://-URL.
// Gibt null zurück, wenn kein (befüllter) file=-Param vorhanden ist → Fallback auf rohe URL.
function obsidianFileName(url) {
  const m = /[?&]file=([^&]*)/.exec(url)
  if (!m || !m[1]) return null
  try { return decodeURIComponent(m[1]) } catch { return m[1] }
}

function LinkRow({ link, onRemove, onOpenIssue }) {
  const [hover, setHover] = useState(false)
  const isIssue = link.type === 'issue'
  // DD-340 R2: obsidian://-Links TYP-UNABHÄNGIG erkennen — PO legt sie auch als
  // vault-Typ an (target = obsidian://-URL, vorher als rohes [[obsidian://…]] gerendert).
  // Lesbarer Note-Name (file=-Param) + klickbar.
  const isObsidian = typeof link.target === 'string' && link.target.startsWith('obsidian://')
  const obsidianName = isObsidian ? obsidianFileName(link.target) : null
  let label = link.target
  if (obsidianName) label = obsidianName
  else if (link.type === 'vault') label = `[[${link.target}]]`

  const handleOpen = (e) => {
    if (!isIssue) return
    e.stopPropagation()
    onOpenIssue?.(link.target)
  }

  return (
    <li
      data-ui="todo-detail-modal.links.item"
      data-link-type={link.type}
      onMouseEnter={() => (isIssue || isObsidian) && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'var(--base)',
        border: `1px solid ${hover ? 'var(--peach)' : 'var(--surface0)'}`,
        borderRadius: 6,
        marginBottom: 6,
        fontSize: 12,
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <TypeIcon type={link.type} />
      {isObsidian ? (
        // DD-340: obsidian://-Link klickbar — href bleibt die volle URI, Text = Note-Name.
        <a
          href={link.target}
          rel="noreferrer"
          data-ui="todo-detail-modal.links.item.label"
          title={link.target}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            color: hover ? 'var(--peach)' : 'var(--text)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            fontWeight: 400,
            cursor: 'pointer',
            wordBreak: 'break-all',
            textDecoration: hover ? 'underline' : 'none',
          }}
        >
          {label}
        </a>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          data-ui="todo-detail-modal.links.item.label"
          title={isIssue ? `Issue ${link.target} öffnen` : label}
          disabled={!isIssue}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: 'left',
            background: 'transparent',
            border: 0,
            padding: 0,
            color: isIssue && hover ? 'var(--peach)' : 'var(--text)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            fontWeight: isIssue ? 700 : 400,
            cursor: isIssue ? 'pointer' : 'default',
            wordBreak: 'break-all',
            textDecoration: isIssue && hover ? 'underline' : 'none',
          }}
        >
          {label}
        </button>
      )}
      <span style={{ fontSize: 10, color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
        {link.type}
      </span>
      <button
        type="button"
        aria-label="Link entfernen"
        data-ui="todo-detail-modal.links.item.remove"
        onClick={() => onRemove?.(link.id)}
        style={{
          background: 'transparent',
          border: 0,
          color: 'var(--overlay0)',
          cursor: 'pointer',
          padding: '2px 6px',
          fontSize: 13,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </li>
  )
}

export default function TodoLinksList({ links, onRemove, onOpenIssue }) {
  if (!links || links.length === 0) {
    return (
      <p
        data-ui="todo-detail-modal.links.empty"
        style={{ color: 'var(--subtext0)', fontSize: 12, margin: '4px 0 0', fontFamily: 'var(--font-display, system-ui)' }}
      >
        Keine verlinkten Dokumente.
      </p>
    )
  }
  return (
    <ul data-ui="todo-detail-modal.links" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {links.map((l) => <LinkRow key={l.id} link={l} onRemove={onRemove} onOpenIssue={onOpenIssue} />)}
    </ul>
  )
}
