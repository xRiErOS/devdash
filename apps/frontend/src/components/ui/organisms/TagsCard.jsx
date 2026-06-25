/**
 * TagsCard — kanonisches, token-sauberes Organism (DD-481 Phase 3 Batch 3,
 * Harvest aus src/components/settings/TagsCard.jsx).
 *
 * Domänen-bewusste Einheit: Tag-CRUD-Card eines Projekts (Liste vorhandener Tags
 * mit Usage-Count, Inline-Edit von Name+Farbe, Anlegen neuer Tags, Löschen).
 * Komponiert die Atoms Card, CardHead, Pill, Input und Button.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle lud die Tags via `fetch('/api/tags')` (useEffect+load) und rief bei
 *    Mutation direkt `POST/PUT/DELETE /api/tags(/:id)` + `load()`. Daten kommen
 *    jetzt als `tags`-Prop rein; die Mutationen sind zu den Callback-Props
 *    `onCreate({name,color})`, `onUpdate(id,{name,color})` und `onDelete(tag)`
 *    gehoben. Der Konsument führt die API-Calls aus und liefert die neue Liste
 *    via `tags`-Prop zurück.
 *  - Der `busy`-State (vorher lokal um async-fetch) ist als `busy`-Prop gehoben —
 *    der Konsument kennt den Mutations-In-Flight-Zustand.
 *  - Der `err`-String (vorher lokal aus fetch-catch) ist als `error`-Prop gehoben.
 *  - Der `confirm()`-Guard beim Löschen entfällt — Confirmation ist Sache des
 *    Konsumenten im `onDelete`-Callback.
 *  - Das gestylte `TagChip` aus TagMultiSelect.jsx (inline-style) wird NICHT
 *    importiert; stattdessen ein lokales, token-cleanes `<Pill>` mit statischer
 *    Farb→color-Map (gleiche Chip-Semantik, 0 inline-style).
 *
 * Ephemerer UI-State (bleibt lokal): Draft-Formular für neuen Tag (newName/
 * newColor), Inline-Edit-Ziel (editingId) und Edit-Draft (editForm).
 *
 * @param {object} props
 * @param {Array<{id:number,name:string,color:string,usage_count?:number}>} [props.tags=[]] - Tag-Liste (gehoben)
 * @param {boolean} [props.busy=false] - Mutation in-flight → Trigger disabled
 * @param {string} [props.error=''] - Fehlertext aus letzter Mutation (gehoben)
 * @param {(payload:{name:string,color:string})=>void} [props.onCreate] - neuen Tag anlegen
 * @param {(id:number, payload:{name:string,color:string})=>void} [props.onUpdate] - Tag editieren
 * @param {(tag:object)=>void} [props.onDelete] - Tag löschen (Confirmation beim Konsumenten)
 * @param {string} [props.dataUiScope='tags-card'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState } from 'react'
import { Tags } from 'lucide-react'
import Card from '../atoms/Card.jsx'
import CardHead from '../atoms/CardHead.jsx'
import Pill from '../atoms/Pill.jsx'
import Input from '../atoms/Input.jsx'
import Button from '../atoms/Button.jsx'

// DD-53: Tag-Farben auf 6 begrenzt (synchron mit server/api.js + Migration 011).
export const TAG_COLORS = ['blue', 'green', 'peach', 'mauve', 'teal', 'overlay0']

// Catppuccin-Farbname → statische Chip-Klasse (JIT-sichtbar, kein Token-String-
// Interpolation). Ersatz für das inline-style-`TagChip` aus TagMultiSelect.jsx.
const CHIP_CLASS = {
  blue: 'bg-[color-mix(in_srgb,var(--blue)_25%,transparent)] text-[var(--blue)]',
  green: 'bg-[color-mix(in_srgb,var(--green)_25%,transparent)] text-[var(--green)]',
  peach: 'bg-[color-mix(in_srgb,var(--peach)_25%,transparent)] text-[var(--peach)]',
  mauve: 'bg-[color-mix(in_srgb,var(--mauve)_25%,transparent)] text-[var(--mauve)]',
  teal: 'bg-[color-mix(in_srgb,var(--teal)_25%,transparent)] text-[var(--teal)]',
  overlay0: 'bg-[color-mix(in_srgb,var(--overlay0)_25%,transparent)] text-[var(--overlay0)]',
}

// Token-cleanes Tag-Chip auf Basis des Pill-Atoms (rundes Catppuccin-Chip).
function TagChip({ tag, dataUi }) {
  const chip = CHIP_CLASS[tag.color] || CHIP_CLASS.mauve
  return (
    <Pill data-ui={dataUi} className={`rounded-full ${chip}`}>
      {tag.name}
    </Pill>
  )
}

export default function TagsCard({
  tags = [],
  busy = false,
  error = '',
  onCreate,
  onUpdate,
  onDelete,
  dataUiScope = 'tags-card',
  className = '',
}) {
  // Ephemerer UI-State: Draft für neuen Tag + Inline-Edit-Ziel/-Draft.
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('mauve')
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', color: 'mauve' })

  const create = () => {
    const name = newName.trim()
    if (!name) return
    onCreate?.({ name, color: newColor })
    setNewName('')
    setNewColor('mauve')
  }

  const startEdit = (t) => {
    setEditingId(t.id)
    setEditForm({ name: t.name, color: t.color })
  }
  const cancelEdit = () => setEditingId(null)
  const saveEdit = () => {
    onUpdate?.(editingId, editForm)
    setEditingId(null)
  }

  const selectClass =
    'rounded-lg px-2 py-2 border-0 outline-none text-sm bg-[var(--surface0)] text-[var(--text)]'

  return (
    <Card tone="mantle" bordered={false} padding="md" data-ui={dataUiScope} className={`mb-4 ${className}`}>
      <CardHead
        icon={<Tags size={14} />}
        data-ui={`${dataUiScope}.header`}
        className="mb-1"
      >
        <span className="flex items-baseline gap-2">
          <span>Tags</span>
          <span className="text-xs font-normal text-[var(--subtext0)]">
            projekt-spezifisch · {tags.length} Tag(s)
          </span>
        </span>
      </CardHead>
      <p className="text-xs mb-3 text-[var(--subtext0)]">
        Tags ersetzen das alte Plugin-Key-Feld. Issues können mehrere Tags haben.
      </p>

      <div className="space-y-2 mb-3" data-ui={`${dataUiScope}.list`}>
        {tags.map((t) => (
          <div
            key={t.id}
            data-ui={`${dataUiScope}.item`}
            className="rounded-lg p-2 flex items-center gap-2 bg-[var(--base)]"
          >
            {editingId === t.id ? (
              <>
                <Input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  data-ui={`${dataUiScope}.item.name-input`}
                  className="flex-1 text-sm py-1"
                />
                <select
                  value={editForm.color}
                  onChange={(e) => setEditForm((f) => ({ ...f, color: e.target.value }))}
                  data-ui={`${dataUiScope}.item.color-select`}
                  className={`${selectClass} py-1`}
                >
                  {TAG_COLORS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={saveEdit}
                  data-ui={`${dataUiScope}.item.save`}
                >
                  OK
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={cancelEdit}
                  data-ui={`${dataUiScope}.item.cancel`}
                >
                  ×
                </Button>
              </>
            ) : (
              <>
                <TagChip tag={t} dataUi={`${dataUiScope}.item.chip`} />
                <span className="text-xs text-[var(--subtext0)]">
                  {t.usage_count ?? 0}× verwendet
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => startEdit(t)}
                  className="ml-auto"
                  data-ui={`${dataUiScope}.item.edit`}
                >
                  Edit
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => onDelete?.(t)}
                  className="text-[var(--accent-danger)]"
                  data-ui={`${dataUiScope}.item.delete`}
                >
                  Löschen
                </Button>
              </>
            )}
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-xs italic text-[var(--subtext0)]" data-ui={`${dataUiScope}.empty`}>
            Noch keine Tags angelegt.
          </p>
        )}
      </div>

      <div className="flex gap-2" data-ui={`${dataUiScope}.form`}>
        <Input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              create()
            }
          }}
          placeholder="Neuer Tag-Name…"
          data-ui={`${dataUiScope}.form.name-input`}
          className="flex-1 min-h-10"
        />
        <select
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          data-ui={`${dataUiScope}.form.color-select`}
          className={selectClass}
        >
          {TAG_COLORS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button
          variant="primary"
          size="lg"
          disabled={busy || !newName.trim()}
          onClick={create}
          className="bg-[var(--accent-success)]"
          data-ui={`${dataUiScope}.form.add`}
        >
          + Tag
        </Button>
      </div>

      {error && (
        <div
          data-ui={`${dataUiScope}.error`}
          className="rounded-lg p-2 mt-3 text-xs bg-[var(--surface0)] text-[var(--accent-danger)]"
        >
          {error}
        </div>
      )}
    </Card>
  )
}
