// DD-252 (M3-S02 T04): Status-Picker — clickable Status-Pill mit Dropdown der
// gültigen next-states. Drop-in für StatusBadge wenn `onChange` gegeben ist —
// sonst static. UX-Konzept: Klick öffnet Popover, Auswahl löst onChange aus.
// Cancellation prompt für notes (REQUIRES_NOTES).

import { useState, useRef, useEffect } from 'react'
import { getValidIssueTransitions, ISSUE_STATUS_LABELS, REQUIRES_NOTES } from '../lib/issueLifecycleTransitions.js'
import { useConfirmDialog } from '../contexts/ConfirmDialogContext.jsx'
import StatusBadge from './ui/atoms/StatusBadge.jsx'

const STATUS_COLORS = {
  new: '--yellow',
  refined: '--blue',
  planned: '--lavender',
  in_progress: '--peach',
  to_review: '--mauve',
  passed: '--green',
  rejected: '--red',
  done: '--teal',
  cancelled: '--overlay0',
}

export default function StatusPicker({ status, onChange, disabled = false, size = 'md', slug }) {
  // I03-Fix: slug ist required wenn interactive (für E2E + Hover-Label uniqueness)
  if (typeof onChange === 'function' && !slug && import.meta.env.DEV) {
    console.warn('[StatusPicker] interactive Mode ohne `slug`-Prop — Hover-Label-Slugs kollidieren wenn mehrere Picker im DOM. Setze unique slug pro Mount.')
  }
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { prompt } = useConfirmDialog()

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const label = ISSUE_STATUS_LABELS[status] || status
  const colorVar = STATUS_COLORS[status] || '--overlay0'
  const isInteractive = typeof onChange === 'function' && !disabled

  const padding = size === 'sm' ? '1px 6px' : '2px 8px'
  const fontSize = size === 'sm' ? 10 : 11

  // I02-Fix: Static-Mode delegiert an StatusBadge → DRY. Sobald StatusBadge
  // sich ändert, bleibt der Look konsistent.
  if (!isInteractive) {
    return <StatusBadge status={status} />
  }

  const handleSelect = async (next) => {
    setOpen(false)
    let notes = null
    if (REQUIRES_NOTES.has(next)) {
      // I01-Fix: Inline-Notes-Modal via ConfirmDialogProvider statt blockendem
      // window.prompt(). Pattern wie SortableTodoItem / NotesPanel.
      notes = await prompt({
        title: `Statuswechsel auf "${ISSUE_STATUS_LABELS[next]}"`,
        message: 'Notes zum Wechsel sind Pflicht (Backend-Vorgabe).',
        placeholder: 'Grund / Kontext…',
        required: true,
        confirmLabel: 'Statuswechsel bestätigen',
      })
      if (notes === null) return
      if (!notes || !notes.trim()) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('devd-toast', { detail: { message: 'Notes sind Pflicht beim Stornieren', kind: 'error' } }))
        }
        return
      }
    }
    try {
      await onChange(next, notes)
    } catch (e) {
      const msg = e?.message || 'Statuswechsel fehlgeschlagen'
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('devd-toast', { detail: { message: msg, kind: 'error' } }))
      }
    }
  }

  const validNext = getValidIssueTransitions(status)

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        data-ui={slug ? `${slug}.trigger` : 'status-picker.trigger'}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o) }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Status ändern (aktuell: ${label})`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          background: `var(${colorVar})`,
          color: 'var(--on-accent)',
          fontSize,
          fontWeight: 600,
          padding,
          borderRadius: 999,
          lineHeight: 1.4,
          border: 0,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {label}
        <svg width="9" height="9" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" style={{ marginLeft: 4 }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          data-ui={slug ? `${slug}.menu` : 'status-picker.menu'}
          aria-label="Gültige Status-Übergänge"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            zIndex: 40,
            minWidth: 160,
            background: 'var(--mantle)',
            border: '1px solid var(--surface1)',
            borderRadius: 6,
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            padding: 4,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {validNext.length === 0 && (
            <li style={{ padding: '6px 10px', fontSize: 11, color: 'var(--subtext1)', fontStyle: 'italic' }}>
              Keine Übergänge verfügbar
            </li>
          )}
          {validNext.map((next) => {
            const c = STATUS_COLORS[next] || '--overlay0'
            return (
              <li key={next}>
                <button
                  type="button"
                  role="option"
                  aria-selected="false"
                  data-ui={slug ? `${slug}.option.${next}` : `status-picker.option.${next}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelect(next) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '6px 10px',
                    background: 'transparent',
                    color: 'var(--text)',
                    border: 0,
                    borderRadius: 4,
                    cursor: 'pointer',
                    fontSize: 12,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface0)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: `var(${c})`,
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  {ISSUE_STATUS_LABELS[next] || next}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </span>
  )
}
