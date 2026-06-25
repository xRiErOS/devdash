import WidgetDot from '../atoms/WidgetDot.jsx'
import { REVEAL_ON_HOVER } from '../atoms/IconButton.jsx'

// GF-2 WidgetBase E1 — WidgetHeading (molecule). Self-titled Slot-Heading des Widgets:
// WidgetDot + Titel (heading-accent, AA-large via red/peach-Token) + hover-reveal Actions.
// NEU (kein In-Place-Evolve von WidgetHeader — der bleibt bis Wave-5-Retire). Kein //-Slash (D-C).
// Hover-Reveal setzt `group` am Parent (WidgetBase) voraus.
export default function WidgetHeading({ heading, action, showDot = true, className = '', dataUi = 'widget-heading' }) {
  if (heading == null) return null
  return (
    <div data-ui={dataUi} className={`flex items-center gap-2 text-[15px] font-semibold tracking-[-0.01em] ${className}`}>
      {showDot && <WidgetDot dataUi={`${dataUi}.dot`} />}
      <span data-ui={`${dataUi}.title`} className="text-[var(--heading-accent)]">{heading}</span>
      {action != null && (
        <span
          data-ui={`${dataUi}.actions`}
          className={`ms-auto inline-flex items-center gap-2 transition-opacity ${REVEAL_ON_HOVER}`}
        >
          {action}
        </span>
      )}
    </div>
  )
}
