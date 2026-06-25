// IssueGroup — Organism (DD-503 Harvest aus src/views/SprintDetail.jsx).
//
// Type-gruppierte Issue-Sektion: ein <section> mit Type-Header (TypeIcon +
// Label + Count-Pill) über einer Liste von Row-Knoten. Reines Layout-Organism:
// es kennt KEINE konkrete Row-Implementierung — die Zeilen werden über die
// `renderRow`-Render-Prop von außen geliefert (D-DD503-01). So bleibt das
// Organism frei von view-spezifischen Abhängigkeiten (StatusPicker / lokale
// IssueRow), und die Quell-View behält ihr Row-Verhalten 1:1, während DD-504/
// DD-509 die Row später auf die kanonische IssueRow umstellen können.
//
// Label-Auflösung: TYPE_LABELS (kanonisches Atom) zuerst, dann optionale
// fallbackLabels (z.B. {core:'Core'} — gültige DB-Enums, die TYPE_LABELS nicht
// abdeckt), dann der rohe Type, dann 'Sonstige'.
//
// PRESENTATIONAL: kein Store/Fetch, kein ephemerer State. data-ui-Wurzel-
// bereich ist parametrisiert (`dataUiScope`, Default 'issues'); der Anker wird
// zu `<dataUiScope>.group.<type>`. Die SprintDetail-View reicht
// 'sprint-detail.issues' durch → Anker 'sprint-detail.issues.group.<type>' 1:1.
//
// @param {object} props
// @param {string} props.type - Issue-Type (feature/bug/improvement/chore/refactor/security/core/...).
// @param {Array<object>} props.items - Issue-Datensätze dieser Gruppe.
// @param {(item:object) => import('react').ReactNode} props.renderRow - Render-Prop je Zeile (liefert den Row-Knoten; muss selbst `key` setzen → bekommt das Item).
// @param {Object<string,string>} [props.fallbackLabels={}] - Fallback Type→Label für Types außerhalb TYPE_LABELS.
// @param {string} [props.dataUiScope='issues'] - parametrisierter data-ui-Wurzelbereich.

import { TypeIcon, TYPE_LABELS } from '../atoms/typeIcons.jsx'

export default function IssueGroup({
  type,
  items,
  renderRow,
  fallbackLabels = {},
  dataUiScope = 'issues',
}) {
  if (!items?.length) return null
  const label = TYPE_LABELS[type] || fallbackLabels[type] || type || 'Sonstige'
  return (
    <section data-ui={`${dataUiScope}.group.${type}`} className="mb-[var(--space-4,16px)]">
      <h3 className="text-[11px] font-[family-name:var(--font-display)] font-bold uppercase tracking-[0.08em] text-[var(--subtext0)] mt-0 mb-2 mx-0 inline-flex items-center gap-2">
        <TypeIcon type={type} size={14} />
        {label}
        <span className="bg-[var(--surface0)] text-[var(--subtext0)] text-[10px] px-1.5 py-px rounded-full font-bold">
          {items.length}
        </span>
      </h3>
      {items.map(it => renderRow(it))}
    </section>
  )
}
