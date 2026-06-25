// @ts-check
// DD-563 (Sprint DD#78, Triplet 4/6): Autoritatives Zod-Contract-Modul für die
// project-memories-Payloads (log/update/supersede). Single Source — REST (server/api.js
// via server/lib/projectMemories.js), CLI (bin/devd-cli.js) und MCP (mcp/devd-mcp.js)
// leiten hieraus ab (Muster aus project_memory CONTRACT-GATEWAY-PATTERN #303 / DD-557,
// fortgeführt DD-560/DD-561/DD-562).
//
// WICHTIG: Die werfende Autorität für Memory-Validierung bleibt in
// server/lib/projectMemories.js (pure Funktionen mit eigener ProjectMemoryError-Klasse +
// exakten Messages + Codes, getestet in tests/mem9-project-memory). Der REST-Pfad wirft
// weiterhin aus der Lib (kein hand-getipptes safeParse in server/api.js — die Routes
// reichen req.body direkt an die Lib-Funktionen durch). Dieses Modul liefert:
//   1. MEMORY_CATEGORIES als Single Source (die Lib importiert das Array statt es hart
//      abzutippen → CATEGORIES === MEMORY_CATEGORIES, Reihenfolge load-bearing für die
//      `category muss eine von: …`-Message), und
//   2. die Struktur-/Typ-/Required-Contracts für CLI-Guards + Tooling.
// Anchor-Pattern, anchor-Uniqueness, FTS-Indexing, supersede-Chain und die
// Migration-042-Granularitäts-Gates bleiben in der Lib.

import { z } from 'zod'

// Spiegel von server/lib/projectMemories.js CATEGORIES (frozen array) und der
// Migration-041-CHECK-Constraint. Reihenfolge ist load-bearing: die Lib baut ihre
// `category muss eine von: ${CATEGORIES.join(', ')}`-Message aus exakt diesem Array,
// und die MCP-Inline-Enum (mcp/devd-mcp.js) spiegelt dieselbe Reihenfolge.
export const MEMORY_CATEGORIES = [
  'architecture_decision',
  'dead_end',
  'bug_pattern',
  'convention',
  'external_constraint',
  'session_note',
]

const SUMMARY_MAX = 500
const CONTENT_MAX = 64000
const TAGS_MAX = 1000

// Message exakt wie server/lib/projectMemories.js validateCategory (kein [..]-Bracket,
// anders als TODO_STATUSES), damit der Contract dieselbe Fehlermeldung trägt wie der
// werfende Lib-Pfad.
const categoryEnum = z.enum(MEMORY_CATEGORIES, {
  error: `category muss eine von: ${MEMORY_CATEGORIES.join(', ')}`,
})

// summary: Pflicht + non-empty (trim). Messages exakt wie validateSummary
// ('summary darf nicht leer sein', '… max 500 Zeichen lang sein'). Der leere/missing-Fall
// fällt im Lib-Pfad auf 'summary muss ein String sein' (typeof) bzw. 'summary darf nicht
// leer sein' (trim) — der Contract bildet beide über required + min(1) ab.
const summaryField = z
  .string({ error: 'summary muss ein String sein' })
  .trim()
  .min(1, { error: 'summary darf nicht leer sein' })
  .max(SUMMARY_MAX, { error: `summary darf max ${SUMMARY_MAX} Zeichen lang sein` })

const contentField = z
  .string()
  .max(CONTENT_MAX, { error: `content darf max ${CONTENT_MAX} Zeichen lang sein` })

// tags akzeptiert Array oder String (Lib normalizeTags). Der Contract bleibt lenient:
// Struktur-Check, keine Längenprüfung pro Element (die Lib normalisiert + längt).
const tagsField = z.union([z.array(z.string()), z.string()])

// importance 1|2|3 (Lib validateImportance). coerce, damit der CLI-Number(flag) + roher
// String beide greifen; Range-Message exakt wie Lib.
const importanceField = z.coerce
  .number({ error: 'importance muss 1 (hoch), 2 (normal) oder 3 (niedrig) sein' })
  .int({ error: 'importance muss 1 (hoch), 2 (normal) oder 3 (niedrig) sein' })
  .min(1, { error: 'importance muss 1 (hoch), 2 (normal) oder 3 (niedrig) sein' })
  .max(3, { error: 'importance muss 1 (hoch), 2 (normal) oder 3 (niedrig) sein' })

// pinned lenient: Lib validatePinned akzeptiert true/1/'1' → 1, alles andere → 0.
const pinnedField = z.union([z.boolean(), z.number(), z.string()])

// anchor: Lib validateAnchor (Pattern bleibt in der Lib). Contract deckt nur String/Null.
const anchorField = z.union([z.string(), z.null()])

const stabilityField = z.enum(['stable', 'volatile'], {
  error: "stability muss 'stable' oder 'volatile' sein",
})

const sourceField = z.union([z.string(), z.null()])

// memory log (= createMemory / POST /api/project-memories): category Pflicht (Enum),
// summary Pflicht + non-empty. Restliche Felder optional. status existiert nicht
// (project_memories hat kein status-Feld). Anchor-Pattern/Uniqueness + FTS-Indexing
// bleiben in der Lib.
export const memoryLogContract = z.object({
  category: categoryEnum,
  summary: summaryField,
  content: contentField.nullish(),
  tags: tagsField.nullish(),
  importance: importanceField.nullish(),
  pinned: pinnedField.nullish(),
  anchor: anchorField.optional(),
  stability: stabilityField.nullish(),
  source_type: sourceField.optional(),
  source_ref: sourceField.optional(),
})

// memory update (= updateMemory / PATCH /api/project-memories/:id): alle Felder optional,
// category ∈ Enum wenn gesetzt, summary non-empty wenn gesetzt.
export const memoryUpdateContract = z.object({
  category: categoryEnum.optional(),
  summary: summaryField.optional(),
  content: contentField.nullish(),
  tags: tagsField.nullish(),
  importance: importanceField.nullish(),
  pinned: pinnedField.nullish(),
  anchor: anchorField.optional(),
  stability: stabilityField.nullish(),
  source_type: sourceField.optional(),
  source_ref: sourceField.optional(),
})

// memory supersede (= supersedeMemory / POST /api/project-memories/:id/supersede):
// alle Felder optional (Lib merged mit der existierenden Row), category ∈ Enum wenn gesetzt.
export const memorySupersedeContract = memoryUpdateContract

/** @typedef {z.infer<typeof memoryLogContract>} MemoryLogInput */
/** @typedef {z.infer<typeof memoryUpdateContract>} MemoryUpdateInput */
/** @typedef {z.infer<typeof memorySupersedeContract>} MemorySupersedeInput */
