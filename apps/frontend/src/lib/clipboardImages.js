/**
 * extractImageFiles — zieht aus einem ClipboardData/DataTransfer alle als Datei
 * vorliegenden Bilder. Gemeinsame Quelle für die Review-Paste-Pfade (DD-684):
 * der Notes-Wrapper fängt damit Bild-Pastes im Capture-Phase ab und routet sie
 * an die Attachments, statt note-field sie als Data-URL ins Markdown einbetten
 * zu lassen.
 *
 * @param {DataTransfer|null|undefined} clipboardData
 * @returns {File[]} Bild-Files (leer, wenn keine vorhanden)
 */
export function extractImageFiles(clipboardData) {
  const items = clipboardData?.items
  if (!items) return []
  const out = []
  for (const it of items) {
    if (it.kind === 'file' && typeof it.type === 'string' && it.type.startsWith('image/')) {
      const f = it.getAsFile()
      if (f) out.push(f)
    }
  }
  return out
}
