import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

/**
 * Tooltip — DD#61 Atom. Token-saubere Portal-Tooltip-Primitive (harvested
 * aus ui/Tooltip.jsx, DD-166 R3). Portal in document.body entkommt allen
 * Stacking-Contexts (umgebende Karten nutzen transform/opacity → neuer
 * Stacking-Context lokalisiert z-index). Ankert per getBoundingClientRect am
 * Trigger. Props-driven, kein Store, kein Fetch.
 *
 * Nutzung:
 *   <Tooltip label="Aktion starten"><button>…</button></Tooltip>
 *
 * @param {object} props
 * @param {string} [props.label] - Tooltip-Text. Falsy → nur children gerendert.
 * @param {React.ReactNode} props.children - Trigger-Element
 * @param {'top'|'bottom'} [props.placement='bottom'] - Position relativ zum Trigger
 */
export default function Tooltip({ label, children, placement = 'bottom' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const top = placement === 'top' ? r.top - 8 : r.bottom + 8
    setPos({ top, left: cx })
  }, [open, placement])

  if (!label) return children

  const show = () => setOpen(true)
  const hide = () => setOpen(false)

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        data-ui="tooltip.trigger"
        className="inline-flex"
      >
        {children}
      </span>
      {open && createPortal(
        <span
          role="tooltip"
          data-ui="tooltip.body"
          className={`pointer-events-none fixed z-[9999] px-2 py-1 rounded text-[11px] whitespace-nowrap shadow-lg bg-[var(--surface2)] text-[var(--text)] border border-[var(--surface1)] ${placement === 'top' ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2'}`}
          // runtime-dynamisch: top/left aus getBoundingClientRect des Triggers (LayoutEffect),
          // kein statischer Token möglich
          // eslint-disable-next-line react/forbid-dom-props
          style={{ top: pos.top, left: pos.left }}
        >
          {label}
        </span>,
        document.body
      )}
    </>
  )
}
