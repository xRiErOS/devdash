/**
 * PlaceholderField — P2b-Übergangsbaustein der EntityDetail V2. Skeleton (variable Zeilen)
 * als Stellvertreter für ein echtes Daten-Widget. ENTFÄLLT in P3.
 *
 * SELF-TITLED (GF-2 Wave-4 T02): `heading` opt-in → der Platzhalter trägt seinen Titel selbst
 * via WidgetBase (Layer-3-Fill + WidgetHeading Dot + --heading-accent), exakt wie die echten
 * Widgets (ContentBlock/MetaDataWidget). Ohne `heading` bleibt das nackte titellose Skeleton
 * byte-identisch (Back-Compat: der umgebende Slot stellt den Titel).
 *
 * @param {object} props
 * @param {number} [props.lines=4] - Anzahl Skeleton-Zeilen.
 * @param {import('react').ReactNode} [props.heading] - opt-in Self-Title (WidgetBase). Fehlt → titellos.
 */
import WidgetBase from './WidgetBase.jsx'

const LINE_W = ['w-[92%]', 'w-[74%]', 'w-[84%]', 'w-[63%]', 'w-[88%]', 'w-[70%]']

export default function PlaceholderField({ lines = 4, heading }) {
  const skeleton = (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-2 rounded-full bg-[var(--surface1)] ${LINE_W[i % LINE_W.length]}`} />
      ))}
    </div>
  )
  if (heading == null) return skeleton
  return <WidgetBase heading={heading}>{skeleton}</WidgetBase>
}
