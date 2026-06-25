import { describe, test, expect } from 'vitest'
import { extractImageFiles } from '../../apps/frontend/src/lib/clipboardImages.js'

// DD-684 — Review-Notes-Paste: Bilder werden im Capture-Phase abgefangen und an
// die Attachments geroutet, statt von note-field als Data-URL ins Markdown
// eingebettet zu werden. extractImageFiles ist die gemeinsame Filter-Quelle.

function item(kind, type, file) {
  return { kind, type, getAsFile: () => file }
}

describe('extractImageFiles (DD-684)', () => {
  test('null/undefined clipboardData → leeres Array', () => {
    expect(extractImageFiles(null)).toEqual([])
    expect(extractImageFiles(undefined)).toEqual([])
    expect(extractImageFiles({})).toEqual([])
  })

  test('zieht nur Datei-Items vom Typ image/*', () => {
    const png = { name: 'a.png' }
    const jpg = { name: 'b.jpg' }
    const cd = {
      items: [
        item('file', 'image/png', png),
        item('string', 'text/plain', null), // Text-Paste — ignorieren
        item('file', 'application/pdf', { name: 'c.pdf' }), // Nicht-Bild — ignorieren
        item('file', 'image/jpeg', jpg),
      ],
    }
    expect(extractImageFiles(cd)).toEqual([png, jpg])
  })

  test('reiner Text-Paste → kein Bild (Text bleibt im Feld)', () => {
    const cd = { items: [item('string', 'text/plain', null)] }
    expect(extractImageFiles(cd)).toEqual([])
  })

  test('getAsFile() liefert null → übersprungen', () => {
    const cd = { items: [item('file', 'image/png', null)] }
    expect(extractImageFiles(cd)).toEqual([])
  })
})
