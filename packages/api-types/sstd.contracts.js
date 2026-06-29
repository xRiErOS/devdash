// @ts-check
// DD-564 (Sprint DD#78, Triplet 5/6): Autoritatives Zod-Contract-Modul für die
// SSTD-Slot-Payloads (slot set / line-edit / journal-add). Single Source — die REST-Lib
// (server/lib/sstdSlots.js) sourct SLOT_KEYS + SLOT_LINE_OPS hieraus, CLI (bin/devd-cli.js)
// nutzt die Struktur-Contracts als parseOrThrow-Guards. MCP (mcp/devd-mcp.js) bleibt BEWUSST
// inline (siehe unten). Muster aus project_memory CONTRACT-GATEWAY-PATTERN #303 / DD-557,
// fortgeführt DD-560/DD-561/DD-562/DD-563.
//
// WICHTIG: Die werfende Autorität für Slot-Validierung bleibt in server/lib/sstdSlots.js
// (pure Funktionen mit eigener ProjectSlotError-Klasse + exakten Messages + Codes + Feld,
// getestet in tests/mem16-sstd-slots). Der REST-Pfad wirft weiterhin aus der Lib (kein
// hand-getipptes safeParse in server/api.js — die Slot-Routes reichen req-Daten direkt an
// die Lib-Funktionen durch, die `{ error, code, field }` mit exaktem HTTP-Status liefern).
// Dieses Modul liefert:
//   1. SLOT_KEYS + SLOT_LINE_OPS als Single Source (die Lib importiert die Arrays statt sie
//      hart abzutippen → SLOT_KEYS === Contract, Reihenfolge load-bearing für die
//      `slot_key muss einer von: …` / `op muss einer von: …`-Messages), und
//   2. die Struktur-/Typ-/Required-Contracts für CLI-Guards + Tooling.
// Line-Range-Gates (LINE_OUT_OF_RANGE), op-abhängige Minimal-Zeile (insert_after erlaubt 0),
// der --expect-409-Guard und die CONTENT_MAX-Längengrenze bleiben in der Lib.
//
// MCP-Dedup-Entscheidung (DD-562/563-Lesson): tests/mem18-sstd-mcp/sstdMcpWiring.test.js ist
// ein Source-Shape-Guard — er liest mcp/devd-mcp.js als Text und assertet `toContain('architecture')`
// … sowie `toContain(op)` für jeden Line-Op INNERHALB des slot_edit-Blocks. Die Inline-Literale
// SLOT_KEYS/SLOT_LINE_OPS in mcp/devd-mcp.js BLEIBEN daher inline (Kommentar dort ergänzt); die
// Single Source der Werte liegt in diesem Contract + der REST-Lib.

import { z } from 'zod'

// Spiegel von server/lib/sstdSlots.js SLOT_KEYS (Object.freeze) und Migration 043.
// Reihenfolge load-bearing: die Lib baut ihre `slot_key muss einer von: ${SLOT_KEYS.join(', ')}`-
// Message aus exakt diesem Array, und die MCP-Inline-Enum spiegelt dieselbe Reihenfolge.
export const SLOT_KEYS = [
  'architecture',
  'conventions',
  'sprint_state',
  'roadmap',
  'cross_refs',
  'misc',
]

// Spiegel von server/lib/sstdSlots.js OPS (Line-Op-Vokabular). Reihenfolge load-bearing
// (siehe oben, `op muss einer von: ${OPS.join(', ')}`-Message).
export const SLOT_LINE_OPS = ['patch', 'insert_after', 'insert_before', 'delete']

const CONTENT_MAX = 64000

// Messages exakt wie server/lib/sstdSlots.js validateSlotKey / editSlotLine, damit der Contract
// dieselbe Fehlermeldung trägt wie der werfende Lib-Pfad (Verhalten 1:1).
const slotKeyEnum = z.enum(SLOT_KEYS, {
  error: `slot_key muss einer von: ${SLOT_KEYS.join(', ')}`,
})
const opEnum = z.enum(SLOT_LINE_OPS, {
  error: `op muss einer von: ${SLOT_LINE_OPS.join(', ')}`,
})

// slot set — Slot komplett neu (last-write-wins). slot_key Pflicht (Enum), content Pflicht-String.
// Die REST-Route prüft zusätzlich die content-Schlüssel-Präsenz (400 "Body muss 'content' enthalten")
// VOR der Lib; CONTENT_MAX bleibt der Lib überlassen (CONTENT_TOO_LONG).
export const slotSetContract = z.object({
  slot_key: slotKeyEnum,
  content: z.string({ error: 'content muss ein String sein' }).max(CONTENT_MAX, {
    error: `content darf max ${CONTENT_MAX} Zeichen lang sein`,
  }),
})

// slot line-edit — op Pflicht (Enum), line Pflicht-Ganzzahl. content/expect optional.
// HINWEIS: Die op-abhängige Minimal-Zeile (insert_after erlaubt line=0, sonst >=1), die
// LINE_OUT_OF_RANGE-Range-Prüfung und der --expect-409-Guard bleiben in der Lib (editSlotLine).
// Der Contract pinnt nur Struktur: line muss eine Ganzzahl >= 0 sein (deckt insert_after-0 mit ab).
export const slotEditContract = z.object({
  slot_key: slotKeyEnum.optional(),
  op: opEnum,
  line: z.coerce.number({ error: 'line muss eine Ganzzahl sein' }).int({ error: 'line muss eine Ganzzahl sein' }).min(0, { error: 'line muss eine Ganzzahl sein' }),
  content: z.string().optional(),
  expect: z.string().optional(),
})

// journal add — text Pflicht + non-empty (trim). Wird als session_log-summary gespeichert
// (POST /api/project-memories {category:'session_log', summary:text}, DD2-19); die summary-Validierung
// (non-empty, SUMMARY_MAX) bleibt in server/lib/projectMemories.js validateSummary.
export const journalAddContract = z.object({
  text: z.string({ error: 'text ist Pflichtfeld' }).trim().min(1, { error: 'text ist Pflichtfeld' }),
})

/** @typedef {z.infer<typeof slotSetContract>} SlotSetInput */
/** @typedef {z.infer<typeof slotEditContract>} SlotEditInput */
/** @typedef {z.infer<typeof journalAddContract>} JournalAddInput */
