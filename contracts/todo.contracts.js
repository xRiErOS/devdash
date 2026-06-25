// @ts-check
// DD-562 (Sprint DD#78, Triplet 3/6): Autoritatives Zod-Contract-Modul für die
// project-todos- und todo-links-Payloads. Single Source — REST (server/api.js via
// server/lib/projectTodos.js + projectTodoLinks.js), CLI (bin/devd-cli.js) und MCP
// (mcp/devd-mcp.js) leiten hieraus ab (Muster aus project_memory CONTRACT-GATEWAY-
// PATTERN #303 / DD-557, fortgeführt DD-560/DD-561).
//
// WICHTIG: Die werfende Autorität für ToDo-/Link-Validierung bleibt in
// server/lib/projectTodos.js + server/lib/projectTodoLinks.js (pure Funktionen mit
// eigenen Error-Klassen + exakten Messages, getestet in tests/m03-s01). Dieses Modul
// liefert NUR die Enums als Single Source (Lib importiert sie statt sie hart abzutippen)
// und die Struktur-/Typ-/Required-Contracts für CLI-Guards + MCP-Enum-Dedup.
// Path-Traversal-, URL-, Issue-Key- und [[]]-Bracket-Regeln bleiben in der Lib.

import { z } from 'zod'

// Spiegel von server/lib/projectTodos.js TODO_STATUSES (Set). Reihenfolge ist
// load-bearing: die Lib baut ihren Set hieraus → [...Set].join(', ') in der
// STATUS_INVALID-Message hängt an dieser Reihenfolge.
export const TODO_STATUSES = ['open', 'done', 'cancelled']

// Spiegel von server/lib/projectTodoLinks.js LINK_TYPES (Set). Reihenfolge load-bearing
// (siehe oben, LINK_TYPE_INVALID-Message).
export const TODO_LINK_TYPES = ['spec', 'issue', 'vault', 'url']

const LABEL_MAX = 280
const DETAILS_MAX = 8000
const TARGET_MAX = 2000

// Messages exakt wie server/lib/projectTodos.js validateLabel/validateStatus, damit die
// m03-s01-Regex-Assertions (`/label ist Pflichtfeld/`, `/label darf nicht leer/`,
// `/status muss einer von/`) auch gegen den Contract greifen würden. Der REST-Pfad wirft
// weiterhin aus der Lib; der Contract dient CLI-Guard + Tooling.
const statusEnum = z.enum(TODO_STATUSES, {
  error: `status muss einer von [${TODO_STATUSES.join(', ')}] sein`,
})
const linkTypeEnum = z.enum(TODO_LINK_TYPES, {
  error: `type muss einer von [${TODO_LINK_TYPES.join(', ')}] sein`,
})

// todo create — label Pflicht + non-empty (trim), details optional. status NICHT Teil des
// Create-Pfads (insertTodo defaultet 'open'; CLI/MCP setzen es nicht bei add/create).
export const todoCreateContract = z.object({
  label: z
    .string({ error: 'label ist Pflichtfeld' })
    .trim()
    .min(1, { error: 'label darf nicht leer sein' })
    .max(LABEL_MAX, { error: `label darf max ${LABEL_MAX} Zeichen lang sein` }),
  details: z
    .string()
    .max(DETAILS_MAX, { error: `details darf max ${DETAILS_MAX} Zeichen lang sein` })
    .nullish(),
})

// todo update — alle Felder optional; label non-empty wenn gesetzt; status ∈ Enum wenn
// gesetzt; details nullable (PATCH … {details:null} clearet das Feld, vgl. patchTodo).
export const todoUpdateContract = z.object({
  label: z
    .string()
    .trim()
    .min(1, { error: 'label darf nicht leer sein' })
    .max(LABEL_MAX, { error: `label darf max ${LABEL_MAX} Zeichen lang sein` })
    .optional(),
  status: statusEnum.optional(),
  details: z
    .union([z.string().max(DETAILS_MAX, { error: `details darf max ${DETAILS_MAX} Zeichen lang sein` }), z.null()])
    .optional(),
})

// todo link — type ∈ Enum (Pflicht), target Pflicht + non-empty. Die typ-spezifische
// target-Validierung (URL/Issue-Key/Path-Traversal/Brackets) bleibt in der Lib
// (validateLinkTarget) — der Contract deckt nur Struktur/Typ/Required.
export const todoLinkContract = z.object({
  type: linkTypeEnum,
  target: z
    .string({ error: 'target ist Pflichtfeld' })
    .trim()
    .min(1, { error: 'target ist Pflichtfeld' })
    .max(TARGET_MAX, { error: `target darf max ${TARGET_MAX} Zeichen lang sein` }),
})

/** @typedef {z.infer<typeof todoCreateContract>} TodoCreateInput */
/** @typedef {z.infer<typeof todoUpdateContract>} TodoUpdateInput */
/** @typedef {z.infer<typeof todoLinkContract>} TodoLinkInput */
