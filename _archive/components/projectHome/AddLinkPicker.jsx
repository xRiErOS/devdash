// DD-283 R4 (M3-S02 T03): Add-Link 1:1 aus DD39-Mockup (.add-link-btn + .link-type-picker
// Z.713-734). Dashed "Link hinzufügen"-Button öffnet einen Typ-Picker (4 Optionen mit
// farbigem Icon + Label). Nach Typ-Wahl: Target-Input + peach Submit. Client-Validierung
// erhalten (I12). Slugs todo-detail-modal.links.add.*.

import { useState } from 'react'
import { LINK_TYPES } from '../../lib/projectHomeApi.js'

const ISSUE_PATTERN = /^[A-Z]{2,6}-\d+$/
const URL_PATTERN = /^https?:\/\//i

function validateClient(type, target) {
  const v = target.trim()
  if (!v) return 'Pflichtfeld'
  if (v.length > 2000) return 'max 2000 Zeichen'
  if (type === 'url' && !URL_PATTERN.test(v)) return 'muss mit http(s):// beginnen'
  if (type === 'issue' && !ISSUE_PATTERN.test(v)) return 'Format: DD-123 / MBT-42'
  return null
}

const TYPE_LABELS = { spec: 'Spec-Datei', issue: 'Issue-Key', vault: 'Vault-Wikilink', url: 'URL' }
const TYPE_PLACEHOLDERS = { spec: 'specs/2026-05-22-foo.md', issue: 'DD-123', vault: 'My Note', url: 'https://example.com' }
const TYPE_COLORS = { spec: 'var(--peach)', issue: 'var(--blue)', vault: 'var(--mauve)', url: 'var(--green)' }
const TYPE_ICONS = {
  spec: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  issue: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
  vault: <><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></>,
  url: <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></>,
}

function OptIcon({ type }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TYPE_COLORS[type]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TYPE_ICONS[type]}
    </svg>
  )
}

export default function AddLinkPicker({ onAdd, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState(null)
  const [target, setTarget] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => { setOpen(false); setType(null); setTarget(''); setError(null) }

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const clientErr = validateClient(type, target)
    if (clientErr) { setError(clientErr); return }
    setSubmitting(true)
    setError(null)
    try {
      await onAdd({ type, target: target.trim() })
      reset()
    } catch (err) {
      setError(err?.message || 'Speichern fehlgeschlagen')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        data-ui="todo-detail-modal.links.add"
        onClick={() => setOpen(true)}
        disabled={disabled}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          padding: 8,
          background: 'transparent',
          border: '1.5px dashed var(--surface1)',
          borderRadius: 6,
          color: 'var(--subtext0)',
          fontFamily: 'var(--font-display, system-ui)',
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        + Link hinzufügen
      </button>
    )
  }

  return (
    <div
      data-ui="todo-detail-modal.links.add.picker"
      style={{
        background: 'var(--base)',
        border: '1px solid var(--surface0)',
        borderRadius: 6,
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Typ-Optionen mit Icon */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {LINK_TYPES.map((t) => {
          const active = type === t
          return (
            <button
              key={t}
              type="button"
              data-ui={`todo-detail-modal.links.add.type.${t}`}
              onClick={() => { setType(t); setError(null) }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 10px',
                background: active ? 'color-mix(in srgb, var(--peach) 12%, transparent)' : 'var(--mantle)',
                border: `1px solid ${active ? 'var(--peach)' : 'var(--surface0)'}`,
                borderRadius: 6,
                color: active ? 'var(--peach)' : 'var(--text)',
                fontFamily: 'var(--font-display, system-ui)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              <OptIcon type={t} />
              {TYPE_LABELS[t]}
            </button>
          )
        })}
      </div>

      {/* Target-Input erst nach Typ-Wahl */}
      {type && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            type="text"
            value={target}
            onChange={(e) => { setTarget(e.target.value); setError(null) }}
            placeholder={TYPE_PLACEHOLDERS[type]}
            aria-label={`Link-Target (${TYPE_LABELS[type]})`}
            data-ui="todo-detail-modal.links.add.target"
            disabled={disabled || submitting}
            maxLength={2000}
            autoFocus
            style={{
              flex: 1,
              minWidth: 120,
              padding: '6px 10px',
              background: 'var(--base)',
              color: 'var(--text)',
              border: '1px solid var(--surface0)',
              borderRadius: 4,
              fontSize: 16,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            data-ui="todo-detail-modal.links.add.submit"
            disabled={disabled || submitting || !target.trim()}
            style={{
              padding: '6px 12px',
              background: 'var(--peach)',
              color: 'var(--on-accent)',
              border: 0,
              borderRadius: 4,
              fontFamily: 'var(--font-display, system-ui)',
              fontSize: 12,
              fontWeight: 700,
              cursor: target.trim() ? 'pointer' : 'default',
              opacity: !target.trim() || submitting ? 0.5 : 1,
            }}
          >
            {submitting ? '…' : 'Hinzufügen'}
          </button>
        </form>
      )}

      {error && (
        <span data-ui="todo-detail-modal.links.add.error" role="alert" style={{ fontSize: 11, color: 'var(--red)' }}>
          {error}
        </span>
      )}

      <button
        type="button"
        onClick={reset}
        style={{
          alignSelf: 'flex-start',
          background: 'transparent',
          border: 0,
          color: 'var(--subtext0)',
          fontSize: 11,
          cursor: 'pointer',
          padding: 0,
          fontFamily: 'var(--font-display, system-ui)',
        }}
      >
        Abbrechen
      </button>
    </div>
  )
}
