// @ts-check
// DD2-161 (ehem. ProjectPages T-be1): Zod-Contract für user_notes-Payloads (create/update).
// Single-Source der Feld-/Längen-Regeln; werfende Autorität bleibt server/lib/userNotes.js
// (UserNoteError mit statusCode/code/field, Muster aus sops.js / projectMemories.js).
// user_notes = menschengeschriebene Rich-Entity (kein SSTD-Session-Log-Ersatz; das ist
// project_memories cat=session_log, DD2-19).

import { z } from 'zod'

export const TITLE_MAX = 200
export const DETAILS_MAX = 500

const keyArray = z.array(z.string()).describe('Liste von Entity-Keys (z.B. ["DD2#22"] / ["DD2-161"])')

// DD2-168: schlanker Status-Lifecycle (Migration 070). Werfende Autorität bleibt
// lib/userNotes.js — diese Liste ist Schema-Doku (Worktree-bare-Import-Falle).
export const USER_NOTE_STATUS = ['draft', 'active', 'archived']

export const userNoteCreateSchema = z.object({
  title: z.string().trim().min(1, 'title darf nicht leer sein').max(TITLE_MAX),
  details: z.string().max(DETAILS_MAX).optional(),
  pr_url: z.string().url().nullish(),
  sprints: keyArray.optional(),
  issues: keyArray.optional(),
  status: z.enum(USER_NOTE_STATUS).optional(),
})

// Update: alle Felder optional (Teil-Patch), aber mind. eins wird in der Lib erzwungen.
export const userNoteUpdateSchema = userNoteCreateSchema.partial()
