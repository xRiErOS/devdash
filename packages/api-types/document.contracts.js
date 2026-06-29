// @ts-check
// DD2-21: Zod-Contract für documents-Payloads (create/update). Single-Source der
// Feld-/Längen-Regeln; werfende Autorität bleibt apps/backend/src/lib/documents.js
// (DocumentError mit statusCode/code/field, Muster userNotes.js / projectMemories.js).
// Dokumente sind einem Meilenstein ODER Sprint zugeordnet (Owner aus der Route, nicht
// aus dem Body). Storage = DB-Blob (body), file_path optionaler Hinweis (D02).

import { z } from 'zod'

export const TITLE_MAX = 200
export const BODY_MAX = 1_000_000   // 1 MB Markdown — großzügig für Plan-Dokumente

export const documentCreateSchema = z.object({
  title: z.string().trim().min(1, 'title darf nicht leer sein').max(TITLE_MAX),
  body: z.string().max(BODY_MAX).optional(),
  file_path: z.string().nullish(),
})

// Update: alle Felder optional (Teil-Patch), aber mind. eins wird in der Lib erzwungen.
export const documentUpdateSchema = documentCreateSchema.partial()
