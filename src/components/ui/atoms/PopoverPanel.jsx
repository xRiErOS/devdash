import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * PopoverPanel — kanonische, token-saubere Variante (DD-56 Harvest).
 * Floating-Panel-Optik (Pattern P06/P14): absolute, base-Grund,
 * Token-Border, Schatten, z-30. Positionierung/Outside-Click macht der
 * konsumierende Organism — dies ist nur die Optik-Hülle.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * DD-672 (r3): optionaler Portal-Modus. Liegt das Panel in einem overflow:auto/
 * hidden-Container (z.B. die schmale Master-Detail-Listen-Spalte in SprintReview/
 * SprintDetail), clippt der Container das `absolute`-Panel. CSS laesst overflow-x
 * nicht isoliert `visible`, daher rendert der Portal-Modus das Panel als
 * position:fixed nach document.body und positioniert es viewport-geclampt am
 * Anker (anchorRef = der Trigger-Wrapper). Die fixed-Koordinaten werden imperativ
 * via panelEl.style gesetzt (kein JSX-style → Enforcement-konform). Default-Pfad
 * (absolute) unveraendert.
 *
 * @param {object} props
 * @param {'left'|'right'} [props.align='left'] - Kante zum Anker
 * @param {import('react').ReactNode} [props.children] - Panel-Inhalt
 * @param {string} [props.className] - zusätzliche Klassen
 * @param {boolean} [props.portal=false] - fixed-Portal statt absolute (Clip-Escape)
 * @param {import('react').RefObject<HTMLElement>} [props.anchorRef] - Trigger-Wrapper als Positionsanker (portal)
 * @param {(el: HTMLElement|null) => void} [props.panelRef] - Callback-Ref auf den Panel-Knoten (Outside-Click)
 */

const ALIGN_MAP = {
  left: 'left-0',
  right: 'right-0',
}

const PANEL_CLS =
  'z-30 mt-1 min-w-[180px] rounded-lg bg-[var(--base)] border border-[var(--surface2)] shadow-[0_8px_24px_color-mix(in_srgb,var(--crust)_45%,transparent)]'

// DD-672 (r3): reine fixed-Positionsrechnung — testbar ohne DOM. Klemmt das Panel
// in den Viewport (nie links/rechts/unten abgeschnitten) und flippt nach oben,
// wenn unter dem Anker kein Platz ist.
export function computeFixedPopoverPosition(anchor, panel, viewportW, viewportH, align = 'left', gap = 4, margin = 8) {
  let left = align === 'right' ? anchor.right - panel.width : anchor.left
  left = Math.max(margin, Math.min(left, viewportW - panel.width - margin))

  let top = anchor.bottom + gap
  const overflowsBottom = top + panel.height > viewportH - margin
  const roomAbove = anchor.top - gap - panel.height >= margin
  if (overflowsBottom && roomAbove) {
    top = anchor.top - gap - panel.height
  }
  top = Math.max(margin, Math.min(top, viewportH - panel.height - margin))
  return { left, top }
}

export default function PopoverPanel({
  align = 'left',
  className = '',
  children,
  portal = false,
  anchorRef = null,
  panelRef = null,
  ...rest
}) {
  const localRef = useRef(null)

  const setNode = (el) => {
    localRef.current = el
    if (typeof panelRef === 'function') panelRef(el)
  }

  useLayoutEffect(() => {
    if (!portal) return
    const panelEl = localRef.current
    if (!panelEl) return
    const reposition = () => {
      const anchorEl = anchorRef?.current
      if (!anchorEl || !localRef.current) return
      const a = anchorEl.getBoundingClientRect()
      const { left, top } = computeFixedPopoverPosition(
        a,
        { width: localRef.current.offsetWidth, height: localRef.current.offsetHeight },
        window.innerWidth,
        window.innerHeight,
        align,
      )
      localRef.current.style.left = `${left}px`
      localRef.current.style.top = `${top}px`
      localRef.current.style.visibility = 'visible'
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    return () => {
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
    }
  }, [portal, anchorRef, align])

  if (!portal) {
    const alignClass = ALIGN_MAP[align] || ALIGN_MAP.left
    return (
      <div ref={setNode} data-ui="popover-panel" role="menu" className={`absolute ${PANEL_CLS} ${alignClass} ${className}`} {...rest}>
        {children}
      </div>
    )
  }

  // Portal-Modus: fixed nach document.body, viewport-geclampt. `invisible` bis der
  // Layout-Effect (pre-paint) die Koordinaten gesetzt hat → kein Sprung von 0,0.
  // `left-0 top-0` als Tailwind-Default; der Effect ueberschreibt left/top via style.
  return createPortal(
    <div
      ref={setNode}
      data-ui="popover-panel"
      role="menu"
      className={`fixed left-0 top-0 invisible ${PANEL_CLS} ${className}`}
      {...rest}
    >
      {children}
    </div>,
    document.body,
  )
}
