/**
 * MetaDataWidget — Organism (05.30 Widgets). Verdichtete mono Label/Wert-Liste für die
 * rechte Spalte der EntityDetail-V2-Sektionen. READ-ONLY Anzeige der Meta-/Stammdaten.
 *
 * GF-414 (SSTD §13 D01/D05 + PO-Rework 2026-06-19): kanonischer V2-Meta-Renderer
 * (vormals `MetaList`, zum Organismus gehoben). Die Meta-Daten werden NUR gelesen;
 * Bearbeitung läuft NICHT inline, sondern über einen ghost-Edit-Button (Pencil) →
 * öffnet die `MetaDataForm` via `onEdit`-Callback (Body-Swap-Kanon wie ContentBlock;
 * der komponierende Frame hält die Form-Hoheit). Zweite Affordanz: `onCopyForAi` →
 * ghost Copy-Button. Beide DUMB (nur Callback, kein State).
 *
 * PO-Korrekturen: #1 Copy = ghost-Variante, Teil von Main · #2 Main zwei-spaltig
 * (kanonisch) · #4 KEIN Header per Default — `title` ist opt-in (die komponierende
 * Story/der Slot stellt den Titel). Action-Zeile (Copy/Edit) erscheint nur, wenn ein
 * Callback gesetzt ist.
 *
 * Rows polymorph (Back-Compat): Tuple `[label, value]` ODER Objekt `{label, value, mono?}`.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.heading] - opt-in self-titled Kopf via WidgetBase
 *   (WidgetDot + --heading-accent, kein `// `); Copy/Edit wandern dann als hover-reveal Action
 *   (rechts) in die WidgetHeading. Ohne `heading` bleibt das Widget headless (Back-Compat: Slot/Story stellt den Titel).
 * @param {import('react').ReactNode} [props.title] - opt-in Listentitel (legacy; rendert SubHeading,
 *   CommentLabel-Nachfolger). Bevorzugt `heading` für den self-titled WidgetHeading-Kopf.
 * @param {Array<[import('react').ReactNode, import('react').ReactNode]|object>} [props.rows] - read-Rows (s.o.).
 * @param {1|2} [props.columns=1] - 2 = dichtere Zwei-Spalten-Anordnung (Main-Kanon).
 * @param {()=>void} [props.onCopyForAi] - Copy-Action (dumb); ghost-Button nur wenn gesetzt.
 * @param {()=>void} [props.onEdit] - öffnet die MetaDataForm (dumb); ghost-Pencil nur wenn gesetzt.
 * @param {string} [props.dataUiScope='meta-data-widget'] - Wurzel-data-ui-Bereich; Copy = `<scope>.copy`,
 *   Edit = `<scope>.edit`, Read-Row = `<scope>.row-<i>` (I01: stabiles Index-Suffix gg. Anker-Kollision, Checkliste §3).
 * @param {string} [props.className]
 */
import { Copy, Pencil } from 'lucide-react'
import SubHeading from '../atoms/SubHeading.jsx'
import IconButton from '../atoms/IconButton.jsx'
import WidgetBase from './WidgetBase.jsx'
import Cluster from '../layout/Cluster.jsx'

function normalizeRow(row) {
  return Array.isArray(row) ? { label: row[0], value: row[1] } : row
}

export default function MetaDataWidget({
  heading,
  title,
  rows = [],
  columns = 1,
  onCopyForAi,
  onEdit,
  dataUiScope = 'meta-data-widget',
  className = '',
}) {
  const listClass = columns === 2 ? 'grid grid-cols-2 gap-x-6 gap-y-1.5' : 'space-y-1.5'
  const hasActions = Boolean(onCopyForAi) || Boolean(onEdit)
  // Copy/Edit teilen sich denselben IconButton-Block — entweder als WidgetHeader-Action
  // (heading-Pfad) oder in der Bestands-Toolbar (no-heading-Pfad). DRY, gleiche data-ui-Anker.
  const actions = hasActions ? (
    <>
      {onCopyForAi && (
        <IconButton
          size="sm"
          icon={<Copy size={14} aria-hidden="true" />}
          label="Meta für AI-Agent kopieren"
          variant="ghost"
          onClick={onCopyForAi}
          data-ui={`${dataUiScope}.copy`}
        />
      )}
      {onEdit && (
        <IconButton
          size="sm"
          icon={<Pencil size={14} aria-hidden="true" />}
          label="Meta bearbeiten"
          variant="ghost"
          onClick={onEdit}
          data-ui={`${dataUiScope}.edit`}
        />
      )}
    </>
  ) : null
  // heading-Pfad: WidgetBase self-titled (WidgetDot + --heading-accent, kein //) trägt Copy/Edit
  // als hover-reveal Action (rechts). Ohne heading bleibt die Bestands-Toolbar byte-identisch
  // (Back-Compat für die Slot-Consumer) — nur die äußere Shell stellt WidgetBase (GF-2 Wave-4).
  const hasHead = Boolean(heading) || Boolean(title) || hasActions
  return (
    <WidgetBase
      heading={heading}
      action={actions}
      dataUi={dataUiScope}
      className={`[font-family:var(--font-display)] text-[12px] ${className}`}
    >
      {!heading && (Boolean(title) || hasActions) && (
        <Cluster justify="between" className="flex-nowrap">
          {title ? <SubHeading>{title}</SubHeading> : <span />}
          {hasActions && <Cluster className="flex-nowrap">{actions}</Cluster>}
        </Cluster>
      )}
      <dl className={`${hasHead ? 'mt-2 ' : ''}${listClass}`}>
        {rows.map((row, i) => {
          const r = normalizeRow(row)
          return (
            <div key={String(r.label) || i} data-ui={`${dataUiScope}.row-${i}`} className="flex justify-between gap-3">
              <dt className="text-[var(--subtext0)]">{r.label}</dt>
              <dd className={r.mono ? 'text-[var(--text)] font-mono' : 'text-[var(--text)]'}>{r.value}</dd>
            </div>
          )
        })}
      </dl>
    </WidgetBase>
  )
}
