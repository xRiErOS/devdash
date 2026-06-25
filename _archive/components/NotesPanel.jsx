// DD-273 R4 (M3-S02 T01): Notes-Panel laut DevWiki 40.03 — schwebendes Scratchpad,
// durchgehend sichtbar solange Debug-Mode aktiv. Drag-Handle, Copy-Button, freie
// Textarea. Slugs landen via Alt+Linksklick an der Cursor-Position (DebugContext).
// KEIN per-Slug-DB-Editor mehr (component_notes-API bleibt dormant, ungenutzt).

import { createPortal } from 'react-dom'
import { useDebug } from '../contexts/DebugContext.jsx'

export default function NotesPanel() {
  const {
    enabled,
    note,
    status,
    notePosition,
    notesRef,
    setNote,
    copyNotes,
    onNotesPointerDown,
    onNotesPointerMove,
    onNotesPointerUp,
  } = useDebug()

  if (!enabled) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <section
      data-ui="ui-debug.notes"
      aria-label="UI Debug notes"
      style={{
        position: 'fixed',
        left: notePosition.x,
        top: notePosition.y,
        zIndex: 99997,
        width: 320,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--mantle)',
        border: '1px solid var(--surface0)',
        borderRadius: 8,
        boxShadow: 'var(--shadow-pop, 0 12px 32px rgba(0,0,0,0.6))',
        fontFamily: 'var(--font-display, system-ui)',
        fontSize: 12,
      }}
    >
      <div
        data-ui="ui-debug.notes.drag-handle"
        onPointerDown={onNotesPointerDown}
        onPointerMove={onNotesPointerMove}
        onPointerUp={onNotesPointerUp}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          background: 'var(--surface0)',
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <strong style={{ fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text)' }}>
          Debug Notes
        </strong>
        <span
          style={{
            flex: 1,
            fontSize: 10,
            color: 'var(--subtext0)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {status}
        </span>
        <button
          type="button"
          data-ui="ui-debug.notes.copy"
          onClick={copyNotes}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Debug-Notes in Clipboard kopieren"
          style={{
            background: 'var(--base)',
            color: 'var(--blue)',
            border: '1px solid var(--blue)',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--font-display, system-ui)',
            padding: '2px 8px',
            cursor: 'pointer',
          }}
        >
          Copy
        </button>
      </div>

      <textarea
        ref={notesRef}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        data-ui="ui-debug.notes.textarea"
        aria-label="UI Debug notes text"
        placeholder="Alt+Linksklick fügt data-ui-Namen hier ein."
        rows={10}
        style={{
          minHeight: 160,
          padding: 10,
          background: 'var(--base)',
          color: 'var(--text)',
          border: 0,
          borderBottomLeftRadius: 8,
          borderBottomRightRadius: 8,
          fontSize: 13,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          resize: 'vertical',
          outline: 'none',
        }}
      />
    </section>,
    document.body,
  )
}
