import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import {
  isInputElement,
  getUiDebugIdFromTarget,
  isReservedDebugTarget,
  getUiDebugElementFromTarget,
  createSequenceMatcher,
  RESERVED_PREFIX,
} from '../../src/lib/uiDebugDom.js'

// Mock-Element-Factory
function el({ tag = 'div', dataUi = null, role = null, contentEditable = false, parent = null } = {}) {
  return {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    isContentEditable: contentEditable,
    getAttribute(name) {
      if (name === 'data-ui') return dataUi
      if (name === 'role') return role
      return null
    },
    parentElement: parent,
  }
}

describe('T01 — uiDebugDom (DD-273 Wiki 40.01/40.02)', () => {
  describe('isInputElement', () => {
    test('erkennt input/textarea/select', () => {
      expect(isInputElement(el({ tag: 'input' }))).toBe(true)
      expect(isInputElement(el({ tag: 'textarea' }))).toBe(true)
      expect(isInputElement(el({ tag: 'select' }))).toBe(true)
    })
    test('erkennt contenteditable', () => {
      expect(isInputElement(el({ tag: 'div', contentEditable: true }))).toBe(true)
    })
    test('erkennt role=combobox/textbox', () => {
      expect(isInputElement(el({ tag: 'div', role: 'combobox' }))).toBe(true)
      expect(isInputElement(el({ tag: 'div', role: 'textbox' }))).toBe(true)
    })
    test('ignoriert plain div / button', () => {
      expect(isInputElement(el({ tag: 'div' }))).toBe(false)
      expect(isInputElement(el({ tag: 'button' }))).toBe(false)
    })
    test('robust gegen null/undefined/primitives', () => {
      expect(isInputElement(null)).toBe(false)
      expect(isInputElement(undefined)).toBe(false)
      expect(isInputElement('string')).toBe(false)
      expect(isInputElement(42)).toBe(false)
    })
  })

  describe('getUiDebugIdFromTarget', () => {
    test('liefert data-ui des Targets', () => {
      expect(getUiDebugIdFromTarget(el({ dataUi: 'project-home.tabs.overview' })))
        .toBe('project-home.tabs.overview')
    })
    test('läuft die Parent-Chain hoch wenn Target keinen Slug hat', () => {
      const parent = el({ dataUi: 'app-shell.main' })
      const child = el({ dataUi: null, parent })
      expect(getUiDebugIdFromTarget(child)).toBe('app-shell.main')
    })
    test(`filtert Reserved-Prefix "${RESERVED_PREFIX}" aus`, () => {
      const reserved = el({ dataUi: 'ui-debug.indicator' })
      const child = el({ dataUi: null, parent: reserved })
      expect(getUiDebugIdFromTarget(child)).toBeNull()
    })
    test('returnt null wenn nirgendwo data-ui', () => {
      const root = el()
      const mid = el({ parent: root })
      const child = el({ parent: mid })
      expect(getUiDebugIdFromTarget(child)).toBeNull()
    })
  })

  // DD-273 R3: Hover-Label self-dismiss-Fix (Review-Reject R2 Punkt 4).
  describe('isReservedDebugTarget', () => {
    test('true wenn Target selbst ui-debug.* trägt (Hover-Label)', () => {
      expect(isReservedDebugTarget(el({ dataUi: 'ui-debug.hover-label' }))).toBe(true)
      expect(isReservedDebugTarget(el({ dataUi: 'ui-debug.indicator' }))).toBe(true)
    })
    test('true wenn ein Vorfahr ui-debug.* trägt', () => {
      const reserved = el({ dataUi: 'ui-debug.notes-panel' })
      const child = el({ dataUi: null, parent: reserved })
      expect(isReservedDebugTarget(child)).toBe(true)
    })
    test('false bei normalem Slug (echtes UI-Element)', () => {
      expect(isReservedDebugTarget(el({ dataUi: 'project-home.tabs.overview' }))).toBe(false)
    })
    test('false wenn nirgends data-ui', () => {
      const root = el()
      const child = el({ parent: root })
      expect(isReservedDebugTarget(child)).toBe(false)
    })
  })

  // DD-273 R4: liefert das Element selbst (für Outline-Rect + Alt-Klick-Insert).
  describe('getUiDebugElementFromTarget', () => {
    test('liefert das Element mit data-ui', () => {
      const node = el({ dataUi: 'project-home.tabs.overview' })
      expect(getUiDebugElementFromTarget(node)).toBe(node)
    })
    test('läuft die Parent-Chain hoch', () => {
      const parent = el({ dataUi: 'app-shell.main' })
      const child = el({ dataUi: null, parent })
      expect(getUiDebugElementFromTarget(child)).toBe(parent)
    })
    test('filtert Reserved-Prefix ui-debug.* (Panel hovert sich nicht selbst)', () => {
      const reserved = el({ dataUi: 'ui-debug.notes' })
      expect(getUiDebugElementFromTarget(reserved)).toBeNull()
    })
    test('null wenn nirgends data-ui', () => {
      const root = el()
      const child = el({ parent: root })
      expect(getUiDebugElementFromTarget(child)).toBeNull()
    })
  })

  describe('createSequenceMatcher (g d)', () => {
    test('g dann d → toggle', () => {
      const m = createSequenceMatcher()
      expect(m.feed({ key: 'g' })).toBe('pending')
      expect(m.feed({ key: 'd' })).toBe('toggle')
    })
    test('g dann x → ignore (kein Toggle)', () => {
      const m = createSequenceMatcher()
      m.feed({ key: 'g' })
      expect(m.feed({ key: 'x' })).toBe('ignore')
      expect(m.feed({ key: 'd' })).toBe('ignore')
    })
    test('einzelnes d ohne g → ignore', () => {
      const m = createSequenceMatcher()
      expect(m.feed({ key: 'd' })).toBe('ignore')
    })
    test('Form-Fokus resettet die Sequenz', () => {
      const m = createSequenceMatcher()
      m.feed({ key: 'g' })
      expect(m.feed({ key: 'd', target: el({ tag: 'input' }) })).toBe('form-reset')
      // Sequenz ist jetzt leer — erneutes d kein Toggle
      expect(m.feed({ key: 'd' })).toBe('ignore')
    })
    test('Modifier-Keys resetten die Sequenz', () => {
      const m = createSequenceMatcher()
      m.feed({ key: 'g' })
      expect(m.feed({ key: 'd', metaKey: true })).toBe('modifier-reset')
      expect(m.feed({ key: 'd' })).toBe('ignore')
    })
    test('reset() leert pending state', () => {
      const m = createSequenceMatcher()
      m.feed({ key: 'g' })
      expect(m.pending).toBe('g')
      m.reset()
      expect(m.pending).toBe('')
    })
    test('zweimal g hintereinander bleibt pending', () => {
      const m = createSequenceMatcher()
      m.feed({ key: 'g' })
      expect(m.feed({ key: 'g' })).toBe('pending')
      expect(m.feed({ key: 'd' })).toBe('toggle')
    })
  })
})

// DD-273 R3 — Source-Scan für die beiden Review-Reject-Fixes (R2):
//   (1) Indicator-Badge unsichtbar  → echtes Portal an document.body
//   (2) Notes-Panel öffnet nicht     → Reserved-Guard in onMove
const ROOT = resolve(import.meta.dirname, '../..')
const readSrc = (p) => readFileSync(resolve(ROOT, p), 'utf8')

describe('T01 R3 — Debug Portal (Review-Reject R2)', () => {
  // DD-472 T3E: DebugOverlay relocated → ui/molecules/ (props-driven, no Portal).
  // Portal-Mounting obliegt jetzt AppShell (createPortal dort, s. Test unten).
  test('DebugOverlay (ui/molecules) ist props-driven und exportiert default', () => {
    const s = readSrc('src/components/ui/molecules/DebugOverlay.jsx')
    expect(s).toMatch(/export default function DebugOverlay/)
  })
  // DD-472 T3B: NotesPanel legacy container → _archive/. Das Portal-Mounting
  // übernimmt jetzt DebugNotesPanel in AppShell.jsx (createPortal dort).
  // Legacy-Scan auf src/components/NotesPanel.jsx entfernt — Datei ist archiviert.
  test('AppShell rendert NotesPanel via createPortal an document.body', () => {
    const s = readSrc('src/views/AppShell.jsx')
    expect(s).toMatch(/import \{ createPortal \} from 'react-dom'/)
    expect(s).toMatch(/createPortal\(/)
    expect(s).toMatch(/document\.body/)
  })
  // DD-472 T3E blocker-fix: DebugOverlay state-lift in AppShell vollständig —
  // Wrapper ruft useDebug() auf, mappt hover→rect/label, portal→document.body.
  test('AppShell: DebugOverlay-Wrapper ruft useDebug und portalt an document.body', () => {
    const s = readSrc('src/views/AppShell.jsx')
    // Import der Molekül-Komponente unter einem Alias (kein Namenskonflikt mit Wrapper)
    expect(s).toMatch(/import DebugOverlayView from/)
    // Wrapper-Funktion vorhanden
    expect(s).toMatch(/function DebugOverlay\(\)/)
    // useDebug-Aufruf im Wrapper (hover)
    expect(s).toMatch(/const \{ enabled, hover \} = useDebug\(\)/)
    // enabled-Gate reproduziert Legacy-Verhalten
    expect(s).toMatch(/if \(!enabled\) return null/)
    // hover→rect Mapping
    expect(s).toMatch(/hover\?\.rect/)
    // hover→label Mapping (Cursor-Position + data-ui-id)
    expect(s).toMatch(/hover\.x/)
    expect(s).toMatch(/hover\.id/)
    // createPortal mount an document.body
    expect(s).toMatch(/createPortal\([\s\S]*?DebugOverlayView[\s\S]*?document\.body/)
  })
})

// DD-273 R4 — Rewrite auf DevWiki-40.02/40.03-Scratchpad-Modell (Review-Reject R3).
describe('T01 R4 — Debug-Mode DevWiki-Konformität', () => {
  test('DebugContext: Alt-Klick-Insert + Alt-Rechtsklick-Copy via document-Capture', () => {
    const s = readSrc('src/contexts/DebugContext.jsx')
    expect(s).toMatch(/getUiDebugElementFromTarget/)
    expect(s).toMatch(/altKey/)
    // Document-Capture-Listener (Portal-Coverage, Wiki-Fallstrick)
    expect(s).toMatch(/document\.addEventListener\('click',[\s\S]*?true\)/)
    expect(s).toMatch(/document\.addEventListener\('contextmenu',[\s\S]*?true\)/)
    // Scratchpad-Insert + Escape-Auto-Copy
    expect(s).toMatch(/function insertNote/)
    expect(s).toMatch(/setSelectionRange/)
    expect(s).toMatch(/copyNotes/)
  })
  test('DebugContext: kein per-Slug-DB-State mehr (openNote/selectedSlug entfernt)', () => {
    const s = readSrc('src/contexts/DebugContext.jsx')
    expect(s).not.toMatch(/openNote|selectedSlug|notesOpen/)
  })
  // DD-472 T3E: DebugOverlay relocated → ui/molecules/ (props-driven: rect-Prop, nicht hover.rect).
  test('DebugOverlay (ui/molecules): Element-Outline via rect-Prop (props-driven)', () => {
    const s = readSrc('src/components/ui/molecules/DebugOverlay.jsx')
    expect(s).toMatch(/rect/)
    expect(s).toMatch(/rect\.width/)
  })
  // DD-472 T3B: NotesPanel legacy container → _archive/. Scratchpad-Verhalten
  // wird jetzt durch AppShell (DebugNotesPanel, dataUiScope="ui-debug.notes") +
  // ui/organisms/NotesPanel (value-Prop, onSave-Callback) sichergestellt.
  // Legacy-Scan auf src/components/NotesPanel.jsx entfernt — Datei ist archiviert.
  test('AppShell: DebugNotesPanel reicht note als value + copyNotes als onCopy durch', () => {
    const s = readSrc('src/views/AppShell.jsx')
    expect(s).toMatch(/value=\{note\}/)
    expect(s).toMatch(/onCopy=\{copyNotes\}/)
    expect(s).toMatch(/dataUiScope="ui-debug\.notes"/)
    expect(s).not.toMatch(/componentNotesApi|upsertComponentNote|selectedSlug/)
  })
})
