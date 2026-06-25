import { ArrowLeft, ArrowRight } from 'lucide-react'
import Button from '../atoms/Button.jsx'

/**
 * DetailPager — DD-640 (F8) Molecule. Wiederverwendbarer Vor/Zurück-Pager am
 * unteren Ende von Detailansichten: durch die zugrundeliegende Liste blättern
 * + Positionsanzeige, ohne in die Liste zurückzuspringen. Geteilter Baustein
 * für ItemDetail (Mobile-Detail-Ende) und den Sprint-Review-Auto-Advance (F9).
 *
 * Pure: atStart/atEnd leiten sich aus index/total ab; die Grenzen werden über
 * das HTML-`disabled`-Attribut der Button-Atome erzwungen (nicht nur Styling) →
 * keine Navigation ins Leere. Touch-Target ≥44px (Button size lg = h-11),
 * Safe-Area-aware (pb-[34px], F5 DD-637). Positionierung trägt der Aufrufer
 * über `className` (z.B. absolute-Overlay im Storybook, Flow-Footer in ItemDetail).
 *
 * @param {object} props
 * @param {number} props.index - 1-basierte Position in der Liste
 * @param {number} props.total - Listenlänge
 * @param {() => void} [props.onPrev] - Tap „Zurück"
 * @param {() => void} [props.onNext] - Tap „Weiter"
 * @param {string} [props.prevLabel='Zurück']
 * @param {string} [props.nextLabel='Weiter']
 * @param {string} [props.className] - Positionierung/Layout des Aufrufers
 * @param {string} [props.dataUi='app-shell.pager'] - data-ui-Wurzel; Sub-Anker
 *   (.prev/.position/.advance) werden gepunktet abgeleitet. Erlaubt fachliche
 *   Anker am Einsatzort (z.B. 'backlog.detail-pane.pager') ohne Twin-Datei.
 * @param {'mantle'|'base'|'surface0'} [props.surface='mantle'] - Canon-Fläche (01.15).
 *   Default mantle (Mobile-Overlay/Sprint-Review-Footer); im base-Content-Pane (Backlog)
 *   base, damit der Pager mit dem Detail-Pane verschmilzt (border-t trennt).
 */
const PAGER_SURFACE = {
  mantle: 'bg-[var(--mantle)]',
  base: 'bg-[var(--base)]',
  surface0: 'bg-[var(--surface0)]',
}

export default function DetailPager({
  index,
  total,
  onPrev,
  onNext,
  prevLabel = 'Zurück',
  nextLabel = 'Weiter',
  className = '',
  dataUi = 'app-shell.pager',
  surface = 'mantle',
}) {
  const atStart = index <= 1
  const atEnd = index >= total
  const base = `flex items-center justify-between gap-2 border-t border-[var(--surface2)] ${PAGER_SURFACE[surface] || PAGER_SURFACE.mantle} px-3 py-2 pb-[34px]`
  return (
    <div data-ui={dataUi} className={[className, base].filter(Boolean).join(' ')}>
      <Button variant="ghost" size="lg" disabled={atStart} onClick={onPrev} data-ui={`${dataUi}.prev`}><ArrowLeft size={18} />{prevLabel}</Button>
      <span className="font-mono text-sm tabular-nums" data-ui={`${dataUi}.position`}>{index} / {total}</span>
      <Button variant="ghost" size="lg" disabled={atEnd} onClick={onNext} data-ui={`${dataUi}.advance`}>{nextLabel}<ArrowRight size={18} /></Button>
    </div>
  )
}
