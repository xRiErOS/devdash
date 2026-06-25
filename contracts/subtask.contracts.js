// @ts-check
// DD-565 (Sprint DD#78, Triplet 6/6 — FINAL): Autoritatives Zod-Contract-Modul für die
// Subtask-Payloads (create / edit / status / reorder). Single Source — die REST-Lib
// (server/lib/subtasks.js) sourct das Status-Vokabular SUBTASK_STATUSES hieraus, CLI
// (bin/devd-cli.js) nutzt die Struktur-Contracts als parseOrThrow-Guards. MCP (mcp/devd-mcp.js)
// bleibt BEWUSST inline (siehe unten). Muster aus project_memory CONTRACT-GATEWAY-PATTERN #303 /
// DD-557, fortgeführt DD-560/DD-561/DD-562/DD-563/DD-564.
//
// WICHTIG: Die werfende Autorität für Subtask-Validierung bleibt in server/lib/subtasks.js
// (pure Funktionen mit eigener SubtaskValidationError-Klasse + exakten Messages + HTTP-Status +
// Codes, getestet in tests/dd45-*). Der REST-Pfad wirft weiterhin aus der Lib (kein
// hand-getipptes safeParse in server/api.js — die Subtask-Routes reichen req.body direkt an die
// Lib-Funktionen durch, die {message, status} via SubtaskValidationError liefern). Dieses Modul
// liefert:
//   1. SUBTASK_STATUSES als Single Source (die Lib importiert das Array statt es hart abzutippen
//      → setSubtaskStatus prüft gegen den Contract-Array, Message 'status muss open oder done sein'
//      bleibt unverändert), und
//   2. die Struktur-/Typ-/Required-Contracts für CLI-Guards + Tooling.
// Business-Rules bleiben in der Lib: qa_criteria-Pflicht-auf-done (422 'qa_criteria ist Pflicht
// für done'), status-darf-beim-Anlegen-nur-open (400), Parent-Existenz (404), Reorder-Mengen-
// Identität (400) — der Contract pinnt nur Struktur (title required, position Ganzzahl, etc.).
//
// MCP-Dedup-Entscheidung (DD-562/563/564-Lesson): tests/sma-mcp-parity/subtasks.test.js ist ein
// Source-Shape-Guard — er liest mcp/devd-mcp.js als Text und assertet u.a. `toMatch(/title/)`,
// `/qa_criteria/`, `/done/`, `/id_or_key/` sowie die Route-Strings INNERHALB der jeweiligen
// devd_subtask_*-Blöcke. Die devd_subtask_*-Tools tragen KEIN dedupbares Enum/Konstanten-Literal
// (Status ist als fixes `{ status: 'done' }` im done-Handler hartkodiert, title/qa_criteria/
// position sind reine z.-Param-Typen). Es gibt damit nichts in MCP zu single-sourcen; MCP bleibt
// unverändert. Die Single Source der Werte liegt in diesem Contract + der REST-Lib.

import { z } from 'zod'

// Spiegel von server/lib/subtasks.js setSubtaskStatus (['open', 'done']). Reihenfolge
// load-bearing für die Status-Akzeptanz; die Lib importiert dieses Array statt es hart
// abzutippen. Beim Anlegen ist nur 'open' erlaubt (Lib-Regel), 'done' kommt erst über
// setSubtaskStatus mit qa_criteria-Guard.
export const SUBTASK_STATUSES = ['open', 'done']

// subtask create — title Pflicht (non-empty, trim), qa_criteria/position optional.
// Message exakt wie server/lib/subtasks.js requireTitle ('title ist Pflichtfeld'), damit der
// Contract dieselbe Fehlermeldung trägt wie der werfende Lib-Pfad (Verhalten 1:1). Die
// Parent-Existenz (404) und 'status darf beim Anlegen nur open sein' (400) bleiben in der Lib.
export const subtaskCreateContract = z.object({
  title: z.string({ error: 'title ist Pflichtfeld' }).trim().min(1, { error: 'title ist Pflichtfeld' }),
  qa_criteria: z.string().optional(),
  position: z.coerce.number({ error: 'position must be an integer' }).int({ error: 'position must be an integer' }).optional(),
})

// subtask edit — alle Felder optional (Partial-Update). title-non-empty wird nur geprüft, wenn
// title gesetzt ist (Lib: requireTitle nur bei hasOwnProperty(title)). position muss Ganzzahl
// sein, falls gesetzt. Message exakt wie Lib.
export const subtaskEditContract = z.object({
  title: z.string({ error: 'title ist Pflichtfeld' }).trim().min(1, { error: 'title ist Pflichtfeld' }).optional(),
  qa_criteria: z.string().nullable().optional(),
  position: z.coerce.number({ error: 'position must be an integer' }).int({ error: 'position must be an integer' }).optional(),
})

// subtask status — status Pflicht (Enum SUBTASK_STATUSES). Message exakt wie
// server/lib/subtasks.js setSubtaskStatus ('status muss open oder done sein'). Die
// qa_criteria-Pflicht-auf-done-Regel (422) bleibt in der Lib (kontextabhängig vom Subtask-Zustand).
export const subtaskStatusContract = z.object({
  status: z.enum(SUBTASK_STATUSES, { error: 'status muss open oder done sein' }),
})

// subtask reorder — ordered ids (PUT /api/backlog/:id/subtasks/order). Message exakt wie
// server/lib/subtasks.js reorderSubtasks ('orderedIds muss ein Array sein'). Die
// Mengen-Identitäts-Prüfungen (Duplikate, ungültige id, vollständige Parent-Menge) bleiben in
// der Lib, da sie DB-Zustand brauchen — der Contract pinnt nur die Array-Struktur.
export const subtaskReorderContract = z.object({
  ids: z.array(z.coerce.number({ error: 'orderedIds enthaelt ungueltige id' }).int({ error: 'orderedIds enthaelt ungueltige id' }), { error: 'orderedIds muss ein Array sein' }),
})

/** @typedef {z.infer<typeof subtaskCreateContract>} SubtaskCreateInput */
/** @typedef {z.infer<typeof subtaskEditContract>} SubtaskEditInput */
/** @typedef {z.infer<typeof subtaskStatusContract>} SubtaskStatusInput */
/** @typedef {z.infer<typeof subtaskReorderContract>} SubtaskReorderInput */
