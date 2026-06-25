// DD-273 R4 (M3-S02 T01): Debug-Mode laut DevWiki 40.02 + 40.03 — kanonisches
// Asset `40.99 Assets/ui-debug-layer.tsx`. Scratchpad-Modell (KEIN per-Slug-DB):
//   - g d Sequenz togglet Debug-Mode; Escape = exit + Notes auto-copy in Clipboard
//   - Hover über [data-ui] → Hover-Label am Cursor + Element-Outline ("Ränder")
//   - Alt+Linksklick auf [data-ui] → Slug an Cursor-Position in die Textarea einfügen
//   - Alt+Rechtsklick auf [data-ui] → Slug in Clipboard (Kontextmenü unterdrückt)
//   - Notes-Panel ist durchgehend sichtbar solange Debug aktiv (kein open/close)
//
// Pointer-Aktionen via document-Capture-Listener (Wiki-Fallstrick 40.03): React-
// Capture wird von Portal-Modals geblockt → `document.addEventListener(..., true)`.
//
// Persistenz-Keys:
//   devd:ui-debug:enabled    → '1' | '0'
//   devd:ui-debug:panel-pos  → JSON {x, y}

import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import {
  RESERVED_PREFIX,
  SEQUENCE_TIMEOUT_MS,
  isInputElement,
  getUiDebugElementFromTarget,
  createSequenceMatcher,
} from '../lib/uiDebugDom.js'

const DebugContext = createContext(null)

const LS_ENABLED = 'devd:ui-debug:enabled'
const LS_PANEL_POS = 'devd:ui-debug:panel-pos'
const DEFAULT_POS = { x: 320, y: 92 }
const INITIAL_STATUS = 'Alt+Linksklick fügt data-ui-Slug ein · Alt+Rechtsklick kopiert.'

function readLs(key, fallback) {
  if (typeof window === 'undefined') return fallback
  try {
    const v = window.localStorage.getItem(key)
    return v === null || v === undefined ? fallback : v
  } catch {
    return fallback
  }
}

function writeLs(key, value) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(key, value) } catch { /* quota / private-mode */ }
}

function readPos() {
  const raw = readLs(LS_PANEL_POS, null)
  if (!raw) return DEFAULT_POS
  try {
    const p = JSON.parse(raw)
    if (typeof p?.x === 'number' && typeof p?.y === 'number') return p
  } catch { /* ignore */ }
  return DEFAULT_POS
}

function isAltPointerAction(event) {
  return event.altKey && !event.ctrlKey && !event.metaKey
}

export function DebugProvider({ children }) {
  const [enabled, setEnabled] = useState(readLs(LS_ENABLED, '0') === '1')
  const [hover, setHover] = useState(null) // { id, x, y, rect }
  const [note, setNote] = useState('')
  const [status, setStatus] = useState(INITIAL_STATUS)
  const [notePosition, setNotePosition] = useState(readPos)

  const notesRef = useRef(null)
  // Spiegel des aktuellen Note-Strings, damit insertNote/exitDebug nicht an einem
  // veralteten Closure-Wert hängen (Wiki 40.03: insertNote bewusst kein useCallback).
  const noteRef = useRef('')
  noteRef.current = note
  const posRef = useRef(notePosition)
  posRef.current = notePosition
  const sequenceRef = useRef(createSequenceMatcher())
  const sequenceTimerRef = useRef(null)
  const dragRef = useRef(null)

  const toggleEnabled = useCallback(() => {
    setEnabled((c) => {
      const next = !c
      writeLs(LS_ENABLED, next ? '1' : '0')
      if (!next) setHover(null)
      return next
    })
  }, [])

  const copyNotes = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return
    navigator.clipboard.writeText(noteRef.current)
      .then(() => setStatus('Notes in Clipboard kopiert.'))
      .catch(() => setStatus('Clipboard-Copy fehlgeschlagen.'))
  }, [])

  const exitDebug = useCallback(() => {
    setEnabled(false)
    setHover(null)
    writeLs(LS_ENABLED, '0')
    if (noteRef.current.trim()) copyNotes()
    else setStatus('UI Debug beendet.')
  }, [copyNotes])

  // Slug an Cursor-Position einfügen — NICHT in useCallback (Wiki 40.03: sonst
  // veralteter note-Closure-State).
  function insertNote(id) {
    const ta = notesRef.current
    const cur = noteRef.current
    const start = ta?.selectionStart ?? cur.length
    const end = ta?.selectionEnd ?? cur.length
    const next = cur.slice(0, start) + id + cur.slice(end)
    setNote(next)
    setStatus(`Eingefügt: ${id}`)
    window.requestAnimationFrame(() => {
      if (notesRef.current) {
        notesRef.current.focus()
        notesRef.current.setSelectionRange(start + id.length, start + id.length)
      }
    })
  }

  // Keyboard: g d Sequenz + Escape (Wiki 40.02)
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape' && enabled && !isInputElement(event.target)) {
        event.preventDefault()
        exitDebug()
        sequenceRef.current.reset()
        return
      }
      const result = sequenceRef.current.feed(event)
      if (result === 'toggle') {
        event.preventDefault()
        if (sequenceTimerRef.current) {
          clearTimeout(sequenceTimerRef.current)
          sequenceTimerRef.current = null
        }
        toggleEnabled()
        return
      }
      if (result === 'pending') {
        if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current)
        sequenceTimerRef.current = setTimeout(() => {
          sequenceRef.current.reset()
          sequenceTimerRef.current = null
        }, SEQUENCE_TIMEOUT_MS)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (sequenceTimerRef.current) clearTimeout(sequenceTimerRef.current)
    }
    // enabled als Closure-Wert für den Escape-Check; toggleEnabled/exitDebug stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  // Hover: Slug + Element-Rect (für Label + Outline). Reserved ui-debug.* gefiltert.
  useEffect(() => {
    if (!enabled) {
      setHover(null)
      return
    }
    function onMove(event) {
      const el = getUiDebugElementFromTarget(event.target)
      if (!el) {
        setHover((h) => (h ? null : h))
        return
      }
      const id = el.getAttribute('data-ui')
      const r = el.getBoundingClientRect()
      setHover((h) => {
        // Flacker-Schutz: nur updaten wenn Slug oder Cursor sich relevant ändern.
        if (h && h.id === id && Math.abs(h.x - event.clientX) < 2 && Math.abs(h.y - event.clientY) < 2) return h
        return {
          id,
          x: event.clientX,
          y: event.clientY,
          rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        }
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [enabled])

  // Alt+Linksklick → Slug einfügen · Alt+Rechtsklick → Slug kopieren.
  // Document-Capture-Phase, damit auch Klicks in Portal-Modals erfasst werden.
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return
    function onClick(event) {
      if (!isAltPointerAction(event)) return
      const t = event.target
      // Klick im Notes-Panel selbst nicht als Insert werten.
      if (t?.closest?.('[data-ui="ui-debug.notes"]')) return
      const el = getUiDebugElementFromTarget(t)
      if (!el) return
      event.preventDefault()
      event.stopPropagation()
      insertNote(el.getAttribute('data-ui'))
    }
    function onContextMenu(event) {
      if (!isAltPointerAction(event)) return
      const el = getUiDebugElementFromTarget(event.target)
      if (!el) return
      event.preventDefault()
      event.stopPropagation()
      const id = el.getAttribute('data-ui')
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(id)
          .then(() => setStatus(`Kopiert: ${id}`))
          .catch(() => setStatus('Clipboard-Copy fehlgeschlagen.'))
      }
    }
    document.addEventListener('click', onClick, true)
    document.addEventListener('contextmenu', onContextMenu, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('contextmenu', onContextMenu, true)
    }
  }, [enabled])

  // Drag des Notes-Panels
  const onNotesPointerDown = (event) => {
    dragRef.current = { ox: event.clientX - posRef.current.x, oy: event.clientY - posRef.current.y }
    try { event.currentTarget.setPointerCapture?.(event.pointerId) } catch { /* ignore */ }
  }
  const onNotesPointerMove = (event) => {
    if (!dragRef.current) return
    setNotePosition({
      x: Math.max(8, event.clientX - dragRef.current.ox),
      y: Math.max(8, event.clientY - dragRef.current.oy),
    })
  }
  const onNotesPointerUp = (event) => {
    dragRef.current = null
    writeLs(LS_PANEL_POS, JSON.stringify(posRef.current))
    try { event.currentTarget.releasePointerCapture?.(event.pointerId) } catch { /* ignore */ }
  }

  const value = {
    enabled,
    hover,
    note,
    status,
    notePosition,
    notesRef,
    toggleEnabled,
    exitDebug,
    setNote,
    copyNotes,
    onNotesPointerDown,
    onNotesPointerMove,
    onNotesPointerUp,
    LS_PANEL_POS,
  }

  return <DebugContext.Provider value={value}>{children}</DebugContext.Provider>
}

export function useDebug() {
  const ctx = useContext(DebugContext)
  if (!ctx) {
    return {
      enabled: false,
      hover: null,
      note: '',
      status: '',
      notePosition: DEFAULT_POS,
      notesRef: { current: null },
      toggleEnabled: () => {},
      exitDebug: () => {},
      setNote: () => {},
      copyNotes: () => {},
      onNotesPointerDown: () => {},
      onNotesPointerMove: () => {},
      onNotesPointerUp: () => {},
      LS_PANEL_POS,
    }
  }
  return ctx
}

export { LS_ENABLED, LS_PANEL_POS, RESERVED_PREFIX }
