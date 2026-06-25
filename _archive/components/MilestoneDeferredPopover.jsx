import React, { useEffect, useRef } from 'react'
import { RotateCcw, Info } from 'lucide-react'

/**
 * MilestoneDeferredPopover — DD-291
 *
 * Floating-Popover, das von der „N zurückgestellt"-Indikator-Pill im
 * MilestoneView-Subheader geöffnet wird. Listet alle deferred Milestones
 * und bietet pro Zeile einen Reaktivieren-Button (PATCH deferred=false).
 *
 * Props:
 *   - items: Array<{ id, name, sprints_count? }> — deferred Milestones
 *   - onReactivate: (id) => Promise<void> — Reaktivierungs-Callback
 *   - onClose: () => void — schließt das Popover (Klick außerhalb / ESC)
 *   - anchorRef: React.RefObject<HTMLElement> — Anker für Positionierung
 *
 * Design (gemäß Mockup DD-291 State B, Decisions D08/D09):
 *   - 380px Breite, absolute Positionierung unterhalb des Ankers
 *   - Pro Zeile: dim Pill (M-ID) + Name + Sprint-Count + grüner Reaktivieren-Button
 *   - Footer-Hinweis erklärt die API-Wirkung
 */
export default function MilestoneDeferredPopover({ items = [], onReactivate, onClose, anchorRef }) {
  const popoverRef = useRef(null)

  // ESC schließt; Klick außerhalb schließt.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
      }
    }
    const onDocClick = (e) => {
      const pop = popoverRef.current
      const anc = anchorRef?.current
      if (!pop) return
      if (pop.contains(e.target)) return
      if (anc && anc.contains(e.target)) return
      onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDocClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDocClick)
    }
  }, [onClose, anchorRef])

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Zurückgestellte Milestones"
      data-testid="milestone-deferred-popover"
      style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: '8px',
        width: '380px',
        background: 'var(--base)',
        border: '1px solid var(--surface1)',
        borderRadius: '10px',
        boxShadow: '0 10px 28px rgba(17,17,27,0.18)',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--surface0)',
        background: 'var(--mantle)',
        fontFamily: 'var(--font-display)',
        fontSize: '12px',
        fontWeight: 700,
        color: 'var(--text)',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        Zurückgestellte Milestones
        <span style={{
          marginLeft: 'auto',
          fontSize: '11px', fontWeight: 600,
          color: 'var(--subtext0)',
        }}>
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--hint)', fontSize: '12px' }}>
          Keine zurückgestellten Milestones.
        </div>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, maxHeight: '320px', overflowY: 'auto' }}>
          {items.map(m => (
            <li
              key={m.id}
              data-testid={`milestone-deferred-row-${m.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderBottom: '1px solid var(--surface0)',
              }}
            >
              {/* Dim Pill — Milestone-ID */}
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: '11px', fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '999px',
                background: 'var(--surface0)',
                color: 'var(--overlay0)',
                flexShrink: 0,
              }}>
                M{m.id}
              </span>
              {/* Name */}
              <span style={{
                flex: 1,
                fontSize: '13px',
                color: 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {m.name}
              </span>
              {/* Sprint-Count */}
              {typeof m.sprints_count === 'number' && (
                <span style={{
                  fontSize: '11px',
                  fontFamily: 'var(--font-display)',
                  color: 'var(--hint)',
                  flexShrink: 0,
                }}>
                  {m.sprints_count} Sprint{m.sprints_count === 1 ? '' : 's'}
                </span>
              )}
              {/* Reaktivieren-Button (grün, D08) */}
              <button
                type="button"
                onClick={() => onReactivate?.(m.id)}
                data-testid={`milestone-deferred-reactivate-${m.id}`}
                aria-label={`Milestone "${m.name}" reaktivieren`}
                title="Reaktivieren"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 9px',
                  borderRadius: '6px',
                  border: '1px solid color-mix(in srgb, var(--accent-success) 35%, transparent)',
                  background: 'color-mix(in srgb, var(--accent-success) 14%, transparent)',
                  color: 'var(--accent-success)',
                  fontFamily: 'var(--font-display)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <RotateCcw size={12} />
                Reaktivieren
              </button>
            </li>
          ))}
        </ul>
      )}

      <div style={{
        padding: '8px 14px',
        background: 'var(--mantle)',
        borderTop: '1px solid var(--surface0)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        color: 'var(--hint)',
      }}>
        <Info size={12} />
        Reaktivieren setzt <code style={{ background: 'var(--surface0)', padding: '1px 4px', borderRadius: '3px' }}>deferred=false</code>
      </div>
    </div>
  )
}
