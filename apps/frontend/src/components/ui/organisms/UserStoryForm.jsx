/**
 * UserStoryForm — Organism (05.60 Overlay). Konkretes UserStory-Erfass-/Bearbeiten-Form:
 * komponiert ChecklistFormBase (Modal-Shell blur + Save/Cancel) und DEFINIERT die
 * UserStory-Inhalte. Analog DefinitionOfDoneForm, aber Verdikt-Taxonomie {open,accepted,
 * rejected} statt done-Boolean.
 *
 * Zwei Modi (ein Form, via `variant`):
 *  - `create`: nur Titel-Input → onCreate({ title }).
 *  - `edit`: Titel-Input (vorbefüllt) + Verdikt-Radiogroup (Offen/Akzeptiert/Abgelehnt,
 *    vorbefüllt aus story.verdict) → onPatch({ title, verdict }).
 *
 * Präsentational: Draft lokal, Persistenz via onCreate/onPatch. Höhere Tiers komponieren
 * Atome (Input/Button) — kein rohes Primitiv-Markup (GF-206). Mono (--font-display),
 * token-clean (0 Roh-Hex).
 *
 * data-ui: Wurzel `user-story-form` (= ChecklistFormBase-Scope) + `.title` (Titel-Input) +
 * `.verdict` (Radiogroup, nur edit) mit `.verdict.{open,accepted,rejected}` + `.save`/`.cancel`.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} [props.onClose]
 * @param {'create'|'edit'} [props.variant='create']
 * @param {{key?:string, title?:string, verdict?:'open'|'accepted'|'rejected'}} [props.story] - edit-Modus.
 * @param {(payload:{title:string})=>(void|Promise<void>)} [props.onCreate] - create-Modus.
 * @param {(patch:{title:string, verdict:'open'|'accepted'|'rejected'})=>(void|Promise<void>)} [props.onPatch] - edit-Modus.
 * @param {boolean} [props.saving=false]
 */
import { useEffect, useState } from 'react'
import ChecklistFormBase from './ChecklistFormBase.jsx'
import Input from '../atoms/Input.jsx'
import Button from '../atoms/Button.jsx'

// Verdikt-Optionen → Terminal-Tint-Farbachse (parität zur UserStory-Verdikt-Taxonomie).
const VERDICT = [
  { key: 'open', label: 'Offen' },
  { key: 'accepted', label: 'Akzeptiert' },
  { key: 'rejected', label: 'Abgelehnt' },
]

const FIELD_LABEL = 'flex flex-col gap-1.5 text-[11px] uppercase tracking-[0.05em] text-[var(--subtext0)]'
const FIELD_MONO = 'normal-case tracking-normal [font-family:var(--font-display)]'
// Aktive Verdikt-Tönung am ghost-Button (Text via ! gegen die ghost-Default-Farbe erzwungen,
// Border additiv — kein bg-Konflikt). Inaktiv = transparenter Border (kein Layout-Shift).
const PILL_ACTIVE = {
  open: '!text-[var(--blue)] border-[var(--blue)]',
  accepted: '!text-[var(--green)] border-[var(--green)]',
  rejected: '!text-[var(--red)] border-[var(--red)]',
}
const PILL_INACTIVE = 'border-transparent'

export default function UserStoryForm({
  open,
  onClose,
  variant = 'create',
  story,
  onCreate,
  onPatch,
  saving = false,
}) {
  const isEdit = variant === 'edit'
  const [title, setTitle] = useState(story?.title || '')
  const [verdict, setVerdict] = useState(story?.verdict || 'open')

  // Draft beim Öffnen / Story-Wechsel aus den Props seeden.
  useEffect(() => {
    setTitle(story?.title || '')
    setVerdict(story?.verdict || 'open')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.key, variant, open])

  const trimmed = title.trim()

  const handleSave = async () => {
    if (!trimmed) return
    if (isEdit) {
      await onPatch?.({ title: trimmed, verdict })
    } else {
      await onCreate?.({ title: trimmed })
    }
    onClose?.()
  }

  return (
    <ChecklistFormBase
      open={open}
      onClose={onClose}
      onSave={handleSave}
      saving={saving}
      saveDisabled={!trimmed}
      headerLabel={isEdit ? 'User Story' : 'User Story erfassen'}
      dataUiScope="user-story-form"
    >
      <label className={FIELD_LABEL}>
        <span>Titel</span>
        <Input
          autoFocus
          surface="bordered"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={280}
          aria-label="User-Story-Titel"
          data-ui="user-story-form.title"
          className={FIELD_MONO}
        />
      </label>

      {isEdit && (
        <div className={FIELD_LABEL}>
          <span>Verdikt</span>
          <div data-ui="user-story-form.verdict" role="radiogroup" aria-label="Verdikt" className="flex gap-2">
            {VERDICT.map((v) => {
              const active = verdict === v.key
              return (
                <Button
                  key={v.key}
                  variant="ghost"
                  size="sm"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setVerdict(v.key)}
                  data-ui={`user-story-form.verdict.${v.key}`}
                  className={`border [font-family:var(--font-display)] ${active ? PILL_ACTIVE[v.key] : PILL_INACTIVE}`}
                >
                  {v.label}
                </Button>
              )
            })}
          </div>
        </div>
      )}
    </ChecklistFormBase>
  )
}
