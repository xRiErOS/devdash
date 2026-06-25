// @ts-check
// E01.1 (GF-2 Backend-Epic): Autoritatives Zod-Contract-Modul fuer die User-Story-Payloads
// (create / update / verdict). Single Source — die REST-Lib (server/lib/userStories.js) sourct
// das Verdict-Vokabular USER_STORY_VERDICTS hieraus, CLI (bin/devd-cli.js) nutzt die Struktur-
// Contracts als parseOrThrow-Guards, MCP (mcp/devd-mcp.js) leitet die Tool-Schemas ab.
// Muster aus project_memory CONTRACT-GATEWAY-PATTERN #303 / DD-557 (analog subtask.contracts.js).
//
// Backend-B02 (Namenskollision): die Story-scoped Verdict-Spalte heisst **us_verdict**, NICHT
// `verdict` — Verwechslung mit dem Issue-`review_status ∈ {passed,not_passed,pending}` (D01 binaer)
// vermeiden. us_verdict (Story-Ebene, Display-Badge) ≠ review_status (Issue-Verdict-Ebene). Die
// View mappt us_verdict → verdict an der Datengrenze (T13); der Backend-Vertrag bleibt us_verdict.
//
// D09 (harter Replace): user_stories[].qa = Single-Source per-US-Pruefgrundlage (gemergt aus den
// alten issue-level acceptance_criteria + test_instruction). Diese beiden Issue-Felder sind im
// backlog-Contract abgeloest (siehe contracts/backlog.contracts.js).
//
// Business-Rules bleiben in server/lib/userStories.js (UserStoryValidationError + exakte Messages
// + HTTP-Status): title-Pflicht (400), Parent-Existenz (404). Der Contract pinnt nur Struktur.

import { z } from 'zod'

// Verdict-Taxonomie (Story-Ebene). Reihenfolge load-bearing fuer die Akzeptanz; die Lib
// importiert dieses Array statt es hart abzutippen. Beim Anlegen ist us_verdict immer 'open'
// (Lib-Default); accepted/rejected kommen erst ueber update / set-verdict.
export const USER_STORY_VERDICTS = ['open', 'accepted', 'rejected']

const verdictEnum = z.enum(USER_STORY_VERDICTS, { error: `us_verdict muss einer von ${USER_STORY_VERDICTS.join('|')} sein` })
const positionSchema = z.coerce.number({ error: 'position must be an integer' }).int({ error: 'position must be an integer' })

// user story create — title Pflicht (non-empty, trim); details/qa/position optional. us_verdict
// wird NICHT entgegengenommen (Lib-Default 'open'). Message exakt wie server/lib/userStories.js
// requireTitle ('title ist Pflichtfeld').
export const userStoryCreateContract = z.object({
  title: z.string({ error: 'title ist Pflichtfeld' }).trim().min(1, { error: 'title ist Pflichtfeld' }),
  details: z.string().optional(),
  qa: z.string().optional(),
  position: positionSchema.optional(),
})

// user story update — alle Felder optional (Partial-Update). title-non-empty nur wenn gesetzt.
// details/qa nullable (clearen). us_verdict optional (Enum) — die UserStoryForm onPatch traegt
// {title, verdict} gemeinsam; das mappt der Wrapper auf {title, us_verdict}.
export const userStoryUpdateContract = z.object({
  title: z.string({ error: 'title ist Pflichtfeld' }).trim().min(1, { error: 'title ist Pflichtfeld' }).optional(),
  details: z.string().nullable().optional(),
  qa: z.string().nullable().optional(),
  position: positionSchema.optional(),
  us_verdict: verdictEnum.optional(),
})

// user story set-verdict — dediziertes Verdict-Setzen (Review-Kontext, per-US-Toggle). us_verdict
// Pflicht + Enum.
export const userStoryVerdictContract = z.object({
  us_verdict: verdictEnum,
})

// user story read/row-shape — was server/lib/userStories.js list/get zurueckgibt. key = generiert
// (US-${id}, analog ST-${id}). Fuer Tooling/Doku; nicht request-seitig erzwungen.
export const userStoryContract = z.object({
  id: z.number().int(),
  backlog_id: z.number().int(),
  key: z.string(),
  title: z.string(),
  details: z.string().nullable().optional(),
  qa: z.string().nullable().optional(),
  us_verdict: verdictEnum,
  position: z.number().int(),
})

/** @typedef {z.infer<typeof userStoryCreateContract>} UserStoryCreateInput */
/** @typedef {z.infer<typeof userStoryUpdateContract>} UserStoryUpdateInput */
/** @typedef {z.infer<typeof userStoryVerdictContract>} UserStoryVerdictInput */
/** @typedef {z.infer<typeof userStoryContract>} UserStoryRow */
