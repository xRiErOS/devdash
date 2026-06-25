/**
 * NotesPanel — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/NotesPanel.jsx).
 *
 * Domänen-bewusste Einheit: schwebendes Notiz-/Scratchpad-Panel mit Drag-Handle,
 * Copy-Button und einer freien Notiz-Textarea (DevWiki 40.03 — Debug-Notes-Pattern).
 * Komponiert das Atom Textarea.
 *
 * PRESENTATIONAL (D-Phase3-01): keine Context-/Store-/Fetch-Kopplung. Die gehobene
 * Kopplung gegenüber der Quelle:
 *  - Quelle bezog `note`, `setNote`, `status`, `notePosition`, `copyNotes` und die
 *    Pointer-Handler komplett aus `useDebug()` (DebugContext). Diese Daten-/Store-
 *    Kopplung ist entfernt: der Notiz-Text kommt als `value`-Prop rein, Persistenz
 *    als `onSave(text)`-Callback, die Copy-Aktion als `onCopy(text)`-Callback, die
 *    Position als `position={{x,y}}`-Prop und die Drag-Pointer als optionale
 *    `onDragPointerDown/Move/Up`-Callbacks.
 *  - Das `createPortal(document.body)` der Quelle ist entfernt — das Mounten ins
 *    Overlay-Layer ist Screen-Verantwortung (Phase 5); das Organism rendert sein
 *    Markup an Ort und Stelle (Storybook-/Komposition-tauglich).
 *
 * Ephemerer UI-State BLEIBT lokal:
 *  - `draft` (useState): kontrollierter Textarea-Inhalt, initialisiert aus `value`.
 *  - Auto-Save-Debounce: `setTimeout`/`useRef`-Timer feuert `onSave(draft)` nach
 *    `autoSaveMs` Stille; bei jedem Edit re-armed, beim Unmount gecleart.
 *
 * @param {object} props
 * @param {string} [props.value=''] - aktueller Notiz-Text (Daten-Prop)
 * @param {(text:string)=>void} [props.onSave] - Auto-Save-Callback (debounced)
 * @param {(text:string)=>void} [props.onCopy] - Copy-in-Clipboard-Callback
 * @param {number} [props.autoSaveMs=600] - Debounce-Fenster bis onSave feuert
 * @param {{x:number,y:number}} [props.position={x:24,y:24}] - fixed-Offset des Panels
 * @param {string} [props.statusLabel=''] - kleiner Status-/Hinweis-Text im Header
 * @param {string} [props.title='Debug Notes'] - Header-Titel
 * @param {string} [props.placeholder] - Textarea-Placeholder
 * @param {(e:PointerEvent)=>void} [props.onDragPointerDown] - Drag-Start (Screen-seitig)
 * @param {(e:PointerEvent)=>void} [props.onDragPointerMove] - Drag-Move
 * @param {(e:PointerEvent)=>void} [props.onDragPointerUp] - Drag-Ende
 * @param {string} [props.dataUiScope='notes-panel'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 * @param {React.Ref} [props.textareaRef] - optionaler Ref auf das native textarea-DOM-Element
 *   (wird von AppShell als notesRef aus DebugContext durchgereicht, damit insertNote
 *   setSelectionRange/focus nutzen kann — DD-472 T3B state-lift)
 */

import { useEffect, useRef, useState } from 'react'
import Textarea from '../atoms/Textarea.jsx'

// fixed-Offset-Maps: statische Tailwind-Klassen für die geläufigen Ecken-Presets,
// damit die Position token-/klassen-clean bleibt statt via inline-style.
const POSITION_BASE = 'fixed z-[99997] flex flex-col w-80'

export default function NotesPanel({
  value = '',
  onSave,
  onCopy,
  autoSaveMs = 600,
  position = { x: 24, y: 24 },
  statusLabel = '',
  title = 'Debug Notes',
  placeholder = 'Alt+Linksklick fügt data-ui-Namen hier ein.',
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  dataUiScope = 'notes-panel',
  className = '',
  textareaRef,
  collapsed = false,
  onToggleCollapse,
}) {
  const [draft, setDraft] = useState(value)
  const timerRef = useRef(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // Externe value-Änderung (z.B. Reset/Reload) übernehmen.
  useEffect(() => {
    setDraft(value)
  }, [value])

  // Debounce-Timer beim Unmount aufräumen.
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const handleChange = (e) => {
    const next = e.target.value
    setDraft(next)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onSaveRef.current?.(next)
    }, autoSaveMs)
  }

  const handleCopy = () => onCopy?.(draft)

  return (
    <section
      data-ui={dataUiScope}
      aria-label="Notes panel"
      className={`${POSITION_BASE} left-[var(--notes-x)] top-[var(--notes-y)] rounded-lg border border-[var(--surface0)] bg-[var(--surface1)] text-[var(--text)] shadow-[var(--shadow-pop,0_12px_32px_color-mix(in_srgb,var(--text)_24%,transparent))] ${className}`}
      // CSS-Vars tragen den dynamischen Offset – kein inline style-Objekt.
      ref={(el) => {
        if (!el) return
        el.style.setProperty('--notes-x', `${position.x}px`)
        el.style.setProperty('--notes-y', `${position.y}px`)
      }}
    >
      <div
        data-ui={`${dataUiScope}.drag-handle`}
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        className="flex items-center gap-2 px-3 py-2 rounded-t-lg cursor-grab select-none touch-none bg-[var(--surface0)]"
      >
        <strong
          data-ui={`${dataUiScope}.title`}
          className="text-[11px] tracking-wider uppercase text-[var(--text)]"
        >
          {title}
        </strong>
        <span
          data-ui={`${dataUiScope}.status`}
          className="flex-1 text-[10px] whitespace-nowrap overflow-hidden text-ellipsis text-[var(--subtext0)]"
        >
          {statusLabel}
        </span>
        <button
          type="button"
          data-ui={`${dataUiScope}.copy`}
          onClick={handleCopy}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Notizen in Clipboard kopieren"
          className="px-2 py-0.5 rounded-md text-[11px] font-bold border border-[var(--accent-info)] text-[var(--accent-info)] bg-[var(--surface1)] hover:bg-[color-mix(in_srgb,var(--accent-info)_12%,transparent)] cursor-pointer"
        >
          Copy
        </button>
        {onToggleCollapse && (
          <button
            type="button"
            data-ui={`${dataUiScope}.minimize`}
            onClick={onToggleCollapse}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={collapsed ? 'Notizen öffnen' : 'Notizen minimieren'}
            className="px-1 text-sm leading-none text-[var(--text)] cursor-pointer"
          >
            {collapsed ? '▸' : '▾'}
          </button>
        )}
      </div>

      {!collapsed && (
        <Textarea
          value={draft}
          onChange={handleChange}
          data-ui={`${dataUiScope}.textarea`}
          aria-label="Notes text"
          placeholder={placeholder}
          rows={10}
          className="min-h-40 rounded-t-none rounded-b-lg bg-[var(--surface0)] font-mono text-sm"
          ref={textareaRef}
        />
      )}
    </section>
  )
}
