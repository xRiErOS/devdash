import { useEffect } from 'react'
import { Pencil, X } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'
import Stack from '../layout/Stack.jsx'
import WidgetBase from './WidgetBase.jsx'
import TagChip from '../molecules/TagChip.jsx'
import TagMultiSelect from '../molecules/TagMultiSelect.jsx'

/**
 * EntityTags — GF-330 (W2) Organism (05.30 Widgets). Tag-Zuweisung der Entity-
 * Detail-Schicht (Konkretisierung §4 Tags): zugewiesene Tags als entfernbare
 * Chips (TagChip) + Zuweisen/Anlegen über ein Multi-Select (TagMultiSelect).
 * NICHT TagsCard (= projektweites Tag-CRUD).
 *
 * Präsentational/controlled (wie DefinitionOfDoneWidget/EditableSection): `tags`
 * (zugewiesen) + `options` (verfügbar) als Props; Mutationen über Callbacks
 * (`onRemove`/`onAssign`/`onCreate`). Das Multi-Select erhält nur die NICHT
 * zugewiesenen Optionen (value=[] → reine Zuweis-Affordanz, keine Doppel-Chips);
 * jede Auswahl meldet genau den neu gewählten Tag an `onAssign`.
 *
 * data-ui: Wurzel `entity-tags`; je zugewiesenem Tag `entity-tags.chip-${value}`
 * (TagChip liefert `tag-chip.remove`); Zuweis-Control `entity-tags.add`.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.heading] - optionaler self-titled Header über das
 *   zentrale WidgetHeading-Molekül (Dot + --heading-accent, kein `//`-Slash). Gesetzt → eigene
 *   Header-Zeile (data-ui="entity-tags.heading") mit dem Zuweis-Button (Pencil) als hover-reveal
 *   Action-Slot; die Legacy-Titelzeile entfällt. Weggelassen → headless wie bisher (Slot/Composition
 *   liefert den Titel; back-compat für SprintDetails/MilestoneDetails/MemoryDetails).
 * @param {string} [props.title='Tags']
 * @param {Array<{value:(string|number),label:string,color?:string}>} [props.tags] - zugewiesen
 * @param {Array<{value:(string|number),label:string,color?:string,meta?:import('react').ReactNode}>} [props.options] - verfügbar
 * @param {(value:(string|number))=>void} [props.onRemove]
 * @param {(value:(string|number))=>void} [props.onAssign]
 * @param {(name:string)=>void} [props.onCreate]
 * @param {boolean} [props.allowCreate=true]
 * @param {boolean} [props.disabled=false]
 * @param {boolean} [props.adding=false] - Tag-Zuweis-Modus aktiv (controlled)
 * @param {() => void} [props.onStartAdd] - Pencil-Klick-Callback (öffnet Multi-Select)
 * @param {() => void} [props.onCancelAdd] - Abbrechen (Cancel-Flip-Klick / ESC / Außenklick)
 * @param {import('react').ReactNode} [props.emptyHint='Keine Tags zugewiesen.']
 * @param {boolean} [props.showTitle=true] - Titel-Zeile anzeigen (false für titellose Inline-Nutzung)
 * @param {boolean} [props.compact=false] - dichter Stack-Gap (keine vertikale Lücke zwischen Zeilen)
 * @param {string} [props.className]
 */

// Catppuccin-Tag-Farbe → TagChip-Tone (parität zu TagMultiSelect.COLOR_TO_PALETTE).
const COLOR_TO_TONE = {
  blue: 'info',
  green: 'success',
  peach: 'warning',
  mauve: 'primary',
  teal: 'info',
  overlay0: 'neutral',
  red: 'danger',
}
const toneFor = (color) => COLOR_TO_TONE[color] || 'neutral'

export default function EntityTags({
  heading,
  title = 'Tags',
  tags = [],
  options = [],
  onRemove,
  onAssign,
  onCreate,
  allowCreate = true,
  disabled = false,
  adding = false,
  onStartAdd,
  onCancelAdd,
  emptyHint = 'Keine Tags zugewiesen.',
  showTitle = true,
  compact = false,
  className = '',
}) {
  const assignedValues = tags.map((t) => t.value)
  const assignable = options.filter((o) => !assignedValues.includes(o.value))
  const hasHeading = heading != null

  // Zuweis-/Cancel-Button (Pencil/X). Im heading-Modus wandert er in den WidgetHeading-
  // Action-Slot, sonst bleibt er inline am Ende der Chip-Zeile.
  const addButton = !disabled && onStartAdd ? (
    <IconButton
      icon={adding ? <X size={13} /> : <Pencil size={13} />}
      label={adding ? 'Zuweisen abbrechen' : 'Tags zuweisen'}
      size="sm"
      variant="ghost"
      onClick={adding ? onCancelAdd : onStartAdd}
      data-ui={adding ? 'entity-tags.cancel' : 'entity-tags.add'}
    />
  ) : null

  // Standard-Interaktionsmuster (Inline-Edit-Toggle): im adding-Modus zusätzlich
  // ESC + Außenklick = Abbrechen. Client-only (kein jsdom/SSR) → der Cancel-Flip
  // selbst ist rein render-basiert (testbar), ESC/Außenklick per Visual-QA.
  useEffect(() => {
    if (!adding || !onCancelAdd || typeof document === 'undefined') return undefined
    const onKey = (e) => { if (e.key === 'Escape') onCancelAdd() }
    const onDown = (e) => { if (!e.target.closest?.('[data-ui="entity-tags"]')) onCancelAdd() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [adding, onCancelAdd])

  return (
    <WidgetBase
      heading={hasHeading ? heading : undefined}
      action={hasHeading ? addButton : undefined}
      dataUi="entity-tags"
      className={className}
    >
      <Stack gap={compact ? 'none' : 'sm'}>
        {!hasHeading && showTitle && (
          <h3 data-ui="entity-tags.title" className="text-xs font-semibold uppercase tracking-[0.05em] text-[var(--text)]">{title}</h3>
        )}

        <div className="flex items-center gap-2">
          {tags.length === 0 ? (
            <p data-ui="entity-tags.empty-hint" className="flex-1 text-xs text-[var(--subtext0)]">
              {emptyHint}
            </p>
          ) : (
            <div data-ui="entity-tags.assigned" className="flex-1 flex flex-wrap items-center gap-1.5">
              {tags.map((t) => (
                <span key={t.value} data-ui={`entity-tags.chip-${t.value}`}>
                  <TagChip
                    color={toneFor(t.color)}
                    onRemove={onRemove ? () => onRemove(t.value) : undefined}
                    removeLabel={`${t.label} entfernen`}
                    disabled={disabled}
                  >
                    {t.label}
                  </TagChip>
                </span>
              ))}
            </div>
          )}
          {!hasHeading && addButton}
        </div>

        {adding && (
          <div data-ui="entity-tags.multi-select">
            <TagMultiSelect
              options={assignable}
              value={[]}
              onChange={(vals) => {
                const added = vals[vals.length - 1]
                if (added != null) onAssign?.(added)
              }}
              allowCreate={allowCreate}
              onCreate={(name) => onCreate?.(name)}
              placeholder="Tag zuweisen oder anlegen…"
            />
          </div>
        )}
      </Stack>
    </WidgetBase>
  )
}
