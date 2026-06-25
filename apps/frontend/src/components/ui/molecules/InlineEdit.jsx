import { useState, useEffect, useRef } from 'react'

/**
 * InlineEdit — Molecule (harvest aus components/ui/InlineEdit.jsx).
 * Editierbares Feld mit Display/Edit-Toggle: Klick auf den Text öffnet ein
 * Eingabefeld, Enter speichert, Esc verwirft, Blur committed. Props-driven,
 * generisch — keine Domänen-Logik.
 *
 * Reuse-Hinweis: das ../atoms/Input.jsx-Atom wurde geprüft, aber NICHT verdrahtet —
 * es erzwingt `border-0`, was den load-bearing Edit-Border (1px var(--surface2))
 * im Tailwind-Cascade überschreibt und damit das Display/Edit-Affordance verliert.
 * Verlustfreie Harvest verlangt das sichtbare Input-Rahmen → raw <input> beibehalten.
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex. Toggle-State + data-ui beibehalten
 * (DD-351-Parity über displayUi / inputUi-Props, Default = generisch).
 *
 * @param {object} props
 * @param {string} props.value - aktueller Wert
 * @param {(next:string)=>(void|Promise<void>)} props.onSave - persistiert den getrimmten Wert
 * @param {(msg:string)=>void} [props.onError] - Fehler-Callback bei fehlgeschlagenem Save
 * @param {string} [props.placeholder='(ohne Titel)'] - Platzhalter bei leerem Wert
 * @param {string} [props.testId] - data-testid für Display + Input (Playwright)
 * @param {string} [props.displayUi='inline-edit.display'] - data-ui am Display-Element
 * @param {string} [props.inputUi='inline-edit.input'] - data-ui am Input
 */
export default function InlineEdit({
  value,
  onSave,
  onError,
  placeholder = '(ohne Titel)',
  testId,
  displayUi = 'inline-edit.display',
  inputUi = 'inline-edit.input',
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)
  useEffect(() => { setDraft(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const commit = async () => {
    const next = draft.trim()
    setEditing(false)
    if (!next || next === value) { setDraft(value); return }
    try {
      await onSave(next)
    } catch (err) {
      setDraft(value)
      onError?.(err.message || 'Speichern fehlgeschlagen')
    }
  }
  const cancel = () => { setDraft(value); setEditing(false) }

  if (!editing) {
    return (
      <h2
        data-ui={displayUi}
        data-testid={testId}
        onClick={() => setEditing(true)}
        title="Klicken zum Bearbeiten"
        className="text-lg font-bold leading-snug cursor-text break-words min-h-8 text-[var(--text)]"
      >
        {value || <span className="text-[var(--hint)]">{placeholder}</span>}
      </h2>
    )
  }
  return (
    <input
      ref={inputRef}
      data-ui={inputUi}
      data-testid={testId}
      type="text"
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); e.target.blur() }
        else if (e.key === 'Escape') { e.preventDefault(); cancel() }
      }}
      className="w-full text-lg font-bold leading-snug rounded px-2 py-1 outline-none text-[18px] bg-[var(--surface0)] text-[var(--text)] border border-[var(--surface2)]"
    />
  )
}
