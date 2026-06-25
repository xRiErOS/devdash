// @ts-check
// ProjectPages T-be1 (D-D, Modell B): Zod-Contract für session_notes-Payloads (create/update).
// Single-Source der Feld-/Längen-Regeln; werfende Autorität bleibt server/lib/sessionNotes.js
// (SessionNoteError mit statusCode/code/field, Muster aus sops.js / projectMemories.js).
// session_notes = NEUE separate Rich-Entity (kein SSTD-Journal-Ersatz).

import { z } from 'zod'

export const TITLE_MAX = 200
export const DETAILS_MAX = 500

const keyArray = z.array(z.string()).describe('Liste von Entity-Keys (z.B. ["DD#47"] / ["DD-678"])')

export const sessionNoteCreateSchema = z.object({
  title: z.string().trim().min(1, 'title darf nicht leer sein').max(TITLE_MAX),
  details: z.string().max(DETAILS_MAX).optional(),
  pr_url: z.string().url().nullish(),
  sprints: keyArray.optional(),
  issues: keyArray.optional(),
})

// Update: alle Felder optional (Teil-Patch), aber mind. eins wird in der Lib erzwungen.
export const sessionNoteUpdateSchema = sessionNoteCreateSchema.partial()
