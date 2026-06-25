// ResultField — Molecule (DD-576 Folge, PO-Feedback 2026-06-11).
//
// Zeigt das Issue-Result im Sprint-Review übersichtlich an und macht es für den
// PO bearbeitbar. Drei Aspekte (T01–T03):
//  - T01 editierbar: Stift-Trigger schaltet auf den kanonischen GoalEditor
//    (Textarea + Save/Cancel + Esc/Cmd-S) — Wiederverwendung statt Dopplung.
//  - T02 default längenbegrenzt: View-Modus klemmt den Text auf `clampLines`
//    Zeilen (Tailwind line-clamp), damit lange Results das Review nicht zukleben.
//  - T03 aufklappbar: ein „Mehr/Weniger"-Control hebt die Klemmung auf.
//
// PRESENTATIONAL: kein Store/Fetch. Speichern delegiert via onSave nach oben
// (die View ruft PUT /api/backlog/:id { result }). Ephemerer UI-State
// (editing/expanded) ist bewusst lokal.
//
// Die „ist lang"-Erkennung ist eine deterministische Heuristik (Zeilen- oder
// Zeichen-Schwelle) statt Layout-Messung — robust in jsdom/Snapshots, kein
// useLayoutEffect-Flackern.
//
// @param {object} props
// @param {string} [props.value=''] - aktueller Result-Text.
// @param {(text:(string|null)) => (void|Promise<void>)} [props.onSave] - Speichern-Callback (getrimmter Text oder null).
// @param {boolean} [props.editable=false] - zeigt den Stift-Trigger (Edit-Gate der View, z.B. reviewOpen).
// @param {3|4|6} [props.clampLines=4] - Default-Klemmung im View-Modus.
// @param {string} [props.dataUiScope='result-field'] - parametrisierter data-ui-Wurzelbereich.

import { useState } from 'react'
import { Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import GoalEditor from './GoalEditor.jsx'
import IconButton from '../atoms/IconButton.jsx'

const CLAMP = { 3: 'line-clamp-3', 4: 'line-clamp-4', 6: 'line-clamp-6' }
const EMPTY = '— noch kein Result eingetragen —'
const LONG_CHARS = 240

export default function ResultField({
  value = '',
  onSave,
  editable = false,
  clampLines = 4,
  dataUiScope = 'result-field',
}) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const text = value || ''
  const isLong = text.split('\n').length > clampLines || text.length > LONG_CHARS

  if (editing) {
    return (
      <GoalEditor
        goal={value}
        placeholder="Result beschreiben…"
        onSave={async (t) => { await onSave?.(t); setEditing(false) }}
        onCancel={() => setEditing(false)}
        dataUiScope={`${dataUiScope}.edit`}
      />
    )
  }

  const clampCls = !expanded && isLong ? (CLAMP[clampLines] || CLAMP[4]) : ''
  return (
    <div data-ui={dataUiScope}>
      <div className="flex items-start justify-between gap-2">
        <p
          data-ui={`${dataUiScope}.text`}
          className={`m-0 whitespace-pre-line font-mono text-xs leading-snug text-[var(--text)] ${clampCls}`}
        >
          {text || EMPTY}
        </p>
        {editable && (
          <IconButton
            size="sm"
            variant="ghost"
            icon={<Pencil size={14} aria-hidden="true" />}
            label="Result bearbeiten"
            onClick={() => setEditing(true)}
            data-ui={`${dataUiScope}.edit-trigger`}
          />
        )}
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          data-ui={`${dataUiScope}.toggle`}
          className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent-info)] hover:underline"
        >
          {expanded ? <ChevronUp size={12} aria-hidden="true" /> : <ChevronDown size={12} aria-hidden="true" />}
          {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
        </button>
      )}
    </div>
  )
}
