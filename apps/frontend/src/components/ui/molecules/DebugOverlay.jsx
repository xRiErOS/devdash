// DD#61 Atom — DebugOverlay. Token-sauberer, rein visueller Debug-Layer
// (harvested aus components/DebugOverlay.jsx). Props-driven, kein Store, kein
// Context, kein Portal: der Aufrufer entscheidet, ob/wohin gerendert wird.
// Drei Teile: Indicator-Badge (fixed bottom-right), Element-Outline ("Ränder"
// um ein gehovertes Element) und Hover-Label am Cursor. Die Geometrie
// (rect/label-Position) ist echt runtime-dynamisch und wird per CSS-Custom-
// Property in eine Tailwind-arbitrary-Klasse gereicht — kein statischer Style.

/**
 * @param {object} props
 * @param {boolean} [props.showIndicator=true] - blendet das "UI Debug"-Badge ein
 * @param {string} [props.indicatorLabel='UI Debug'] - Badge-Text
 * @param {{top:number,left:number,width:number,height:number}} [props.rect]
 *        - Bounding-Box des gehoverten Elements (px). Zeichnet den Outline-Rahmen.
 * @param {{left:number,top:number,text:React.ReactNode}} [props.label]
 *        - Hover-Label: Position (px, fixed) + Inhalt (z.B. der data-ui-Key).
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Fragment-Träger
 */
export default function DebugOverlay({
  showIndicator = true,
  indicatorLabel = 'UI Debug',
  rect,
  label,
}) {
  // Runtime-dynamische Geometrie über CSS-Custom-Properties — von Tailwind-
  // arbitrary-Klassen (top-[var(--dbg-*)] …) konsumiert. Reine Variablen-
  // Zuweisung, kein gestalterischer Inline-Style (maxInline=0 erfüllt).
  const rectVars = rect
    ? {
        '--dbg-rect-top': `${rect.top}px`,
        '--dbg-rect-left': `${rect.left}px`,
        '--dbg-rect-w': `${rect.width}px`,
        '--dbg-rect-h': `${rect.height}px`,
      }
    : undefined
  const labelVars = label
    ? {
        '--dbg-label-left': `${label.left}px`,
        '--dbg-label-top': `${label.top}px`,
      }
    : undefined

  return (
    <>
      {showIndicator && (
        <div
          data-ui="ui-debug.indicator"
          role="status"
          aria-live="polite"
          className="fixed right-2 bottom-2 z-[99998] select-none rounded-md bg-[var(--accent-warning)] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.04em] text-[var(--on-accent)] shadow-[var(--shadow-pop,0_2px_6px_rgba(0,0,0,0.4))] pointer-events-none font-[var(--font-display,system-ui)]"
        >
          {indicatorLabel}
        </div>
      )}

      {rect && (
        <div
          data-ui="ui-debug.outline"
          aria-hidden="true"
          // eslint-disable-next-line react/forbid-dom-props -- runtime-dynamische Geometrie (px aus getBoundingClientRect) via CSS-Custom-Property; kein statischer Style möglich
          style={rectVars}
          className="fixed z-[99996] box-border rounded border border-dashed border-[var(--accent-warning)] bg-[color-mix(in_srgb,var(--accent-warning)_8%,transparent)] pointer-events-none top-[var(--dbg-rect-top)] left-[var(--dbg-rect-left)] w-[var(--dbg-rect-w)] h-[var(--dbg-rect-h)]"
        />
      )}

      {label && (
        <div
          data-ui="ui-debug.hover-label"
          role="tooltip"
          // eslint-disable-next-line react/forbid-dom-props -- runtime-dynamische Cursor-Position (px) via CSS-Custom-Property; kein statischer Style möglich
          style={labelVars}
          className="fixed z-[99999] max-w-[320px] break-all rounded bg-[var(--surface1)] px-2 py-1 text-[11px] leading-[1.4] text-[var(--text)] font-mono shadow-[var(--shadow-pop,0_2px_6px_rgba(0,0,0,0.5))] pointer-events-none left-[var(--dbg-label-left)] top-[var(--dbg-label-top)]"
        >
          {label.text}
        </div>
      )}
    </>
  )
}
