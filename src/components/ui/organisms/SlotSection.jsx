/**
 * SlotSection — kanonisches, token-sauberes Organism (DD-481 Extract aus
 * src/components/projectHome/tabs/SstdTab.jsx → Inline-Komponente `SlotSection`).
 *
 * Domänen-bewusste Einheit (Domäne SSTD): rendert EINEN editierbaren SSTD-Slot
 * als Read-View → "Bearbeiten" → Textarea + Speichern/Abbrechen-State-Machine.
 * Titel-Zeile mit Bearbeiten-Button, gerendertes Markdown (read), leer-Hinweis,
 * Editor (Textarea) mit Aktionsleiste (Button × 2) und Fehlerzeile. Komponiert
 * die Atoms Textarea und Button.
 *
 * PRESENTATIONAL (D-Phase3-01): kein fetch/Store/API/useEffect-Datenladen.
 * Gehobene Kopplung gegenüber der Quelle:
 *  - Quelle rief im `save()` direkt `setSstdSlot(projectId, slotKey, draft)` (API)
 *    und `toast(...)` auf und hielt eigenen `saving`/`error`-State aus dem
 *    Await-Ergebnis. Die Mutation ist hier zur Callback-Prop
 *    `onSave(slotKey, nextContent)` gehoben; der Konsument führt den API-Call aus,
 *    meldet `saving`-In-Flight + `error` als Props zurück und schließt den Editor
 *    via `editing`-Reset (content-Prop-Wechsel synct den Draft).
 *  - `projectId`/`onSaved`/`toast`-Kopplung der Quelle entfällt — kein API/Event.
 *  - `renderMarkdown` (reiner Formatter) bleibt importiert — keine Daten-Kopplung.
 *
 * Ephemerer UI-State (bleibt lokal): `editing` (Read/Edit-Umschalter) und `draft`
 * (editierter Slot-Text), via useEffect mit dem `content`-Prop synchronisiert,
 * sobald der Server-Stand wechselt. Das ist KEIN Daten-State (kein fetch).
 *
 * @param {object} props
 * @param {string} props.slotKey - Slot-Schlüssel (architecture|conventions|…) — data-ui + onSave-Arg
 * @param {string} props.title - Slot-Anzeigetitel (z.B. "Architektur")
 * @param {string} [props.content=''] - aktueller Server-Slot-Markdown (leer = "leer"-Hinweis)
 * @param {boolean} [props.saving=false] - Mutation in-flight → Aktionen/Editor disabled
 * @param {string} [props.error=''] - Fehlertext der letzten Mutation
 * @param {(slotKey:string, nextContent:string)=>void} [props.onSave] - Slot speichern (gehoben)
 * @param {string} [props.dataUiScope='slot-section'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.rootDataUi] - DD-500: wenn gesetzt, trägt das WURZEL-Element
 *   (section) exakt diesen `data-ui`-Wert (semantischer Plugin-Anker, z.B.
 *   `plugin.sstd.slot.architecture`) statt des `${dataUiScope}`-Default. Kinder-Anker
 *   (title/edit/rendered/empty/editor/…) bleiben `${dataUiScope}…`. Unset → unverändert.
 * @param {boolean} [props.clip=false] - DD-599 (D03): Read-View mobil (<768px) auf
 *   max-height 40vh clippen + Verlaufs-Fade; Tap öffnet das Volltext-Fenster (onExpand).
 *   Desktop (≥768px) zeigt den vollen Inhalt inline (max-md greift nicht). Off → unverändert.
 * @param {()=>void} [props.onExpand] - DD-599 (D04): Tap auf den geclippten Read-View
 *   → separates Volltext-Fenster (nur wirksam bei clip=true).
 * @param {boolean} [props.hideEditButton=false] - DD-599: Inline-„Bearbeiten" ausblenden
 *   (mobil läuft das Editieren über das Volltext-Fenster statt inline).
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import { renderMarkdown } from '../../../lib/markdown.js'
import Textarea from '../atoms/Textarea.jsx'
import Button from '../atoms/Button.jsx'

export default function SlotSection({
  slotKey,
  title,
  content = '',
  saving = false,
  error = '',
  onSave,
  dataUiScope = 'slot-section',
  rootDataUi = dataUiScope,
  clip = false,
  onExpand,
  hideEditButton = false,
  className = '',
}) {
  // Ephemerer UI-State: Read/Edit-Umschalter + editierter Slot-Text. Der Draft
  // spiegelt den Server-Stand und wird neu gesetzt, sobald sich content ändert.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(content)
  useEffect(() => { setDraft(content) }, [content])

  function startEdit() {
    setDraft(content)
    setEditing(true)
  }

  function cancel() {
    setDraft(content)
    setEditing(false)
  }

  function save() {
    onSave?.(slotKey, draft)
  }

  return (
    <section
      data-ui={`${rootDataUi}`}
      className={`mb-6 ${className}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 data-ui={`${dataUiScope}.title`} className="text-[15px] font-semibold text-[var(--text)]">
          {title}
        </h3>
        {!editing && !hideEditButton && (
          <Button
            variant="secondary"
            size="lg"
            leadingIcon={<Pencil size={15} aria-hidden="true" />}
            onClick={startEdit}
            title="Slot bearbeiten"
            data-ui={`${dataUiScope}.edit`}
          >
            Bearbeiten
          </Button>
        )}
      </div>

      {/* DD-599 (D03/D04): mobil geclippte, antippbare Read-View → Volltext-Fenster. */}
      {!editing && content && clip && (
        <button
          type="button"
          onClick={onExpand}
          data-ui={`${dataUiScope}.clip`}
          className="relative block w-full text-left max-md:max-h-[40vh] max-md:overflow-hidden"
        >
          <div
            data-ui={`${dataUiScope}.rendered`}
            className="text-sm leading-relaxed text-[var(--text)]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
          <span
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-10 max-md:block bg-gradient-to-t from-[var(--mantle)] to-transparent"
            aria-hidden="true"
          />
        </button>
      )}

      {!editing && content && !clip && (
        <div
          data-ui={`${dataUiScope}.rendered`}
          className="text-sm leading-relaxed text-[var(--text)]"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
        />
      )}

      {!editing && !content && (
        <p data-ui={`${dataUiScope}.empty`} className="text-sm italic text-[var(--subtext0)]">leer</p>
      )}

      {editing && (
        <div data-ui={`${dataUiScope}.editor`} className="flex flex-col gap-2.5">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={saving}
            spellCheck={false}
            rows={10}
            data-ui={`${dataUiScope}.editor.field`}
            className="min-h-[200px] font-mono leading-normal bg-[var(--mantle)]"
          />
          {error && (
            <p data-ui={`${dataUiScope}.error`} className="text-sm text-[var(--accent-danger)]">
              Fehler: {error}
            </p>
          )}
          <div data-ui={`${dataUiScope}.actions`} className="flex gap-2.5">
            <Button
              variant="primary"
              size="lg"
              onClick={save}
              disabled={saving}
              loading={saving}
              data-ui={`${dataUiScope}.save`}
            >
              {saving ? 'Speichere…' : 'Speichern'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={cancel}
              disabled={saving}
              data-ui={`${dataUiScope}.cancel`}
            >
              Abbrechen
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
