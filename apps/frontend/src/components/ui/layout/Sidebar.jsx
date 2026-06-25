// src/components/ui/layout/Sidebar.jsx
import { gapClass } from './gap.js'
/**
 * Sidebar — fixe Spalte neben flexiblem Inhalt (Every Layout). Trägt das
 * Master-Detail-Layout (Pattern P11) in ItemDetail + Memory.
 * @param {object} props
 * @param {React.ReactNode} props.side - schmale fixe Spalte
 * @param {string} [props.sideWidth='13.75rem'] - rem, kein px (≈220px)
 * @param {boolean} [props.sideRight=false] - Seitenspalte rechts statt links
 * @param {'none'|'xs'|'sm'|'md'|'lg'} [props.gap='md']
 */
export default function Sidebar({ side, sideWidth = '13.75rem', sideRight = false, gap = 'md', className = '', children, ...rest }) {
  return (
    <div className={`flex flex-wrap ${gapClass(gap)} ${className}`} {...rest}>
      {/* DD-516: Mobile-Collapse — die fixe Seiten-Basis greift erst ab `lg`. Darunter
          (z.B. 375px iPhone SE) nimmt die Spalte die volle Breite und stapelt über
          den Inhalt (flex-wrap), statt eine zu breite fixe Basis zu erzwingen. Die
          runtime-dynamische Breite reist als CSS-Custom-Property (sanktioniertes
          Muster, identisch zu ProgressBar) und wird nur in der `lg:`-Klasse konsumiert. */}
      <div
        className={`shrink-0 min-w-0 basis-full lg:basis-[var(--side-basis)] ${sideRight ? 'order-2' : ''}`}
        // eslint-disable-next-line react/forbid-dom-props
        style={{ '--side-basis': sideWidth }}
      >
        {side}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
