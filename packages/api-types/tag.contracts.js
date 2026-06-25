// @ts-check
// DD-624 (Sprint DD#87): Autoritatives Zod-Contract-Modul für die Tag-Payloads.
// Single Source — REST (server/api.js), CLI (bin/devd-cli.js) und MCP (mcp/devd-mcp.js)
// leiten hieraus ab (Muster aus project_memory CONTRACT-GATEWAY-PATTERN #303 / DD-557).
//
// TAG_COLORS war 4× dupliziert (server/api.js + 3 Frontend-Files). Backend-seitig ist dies
// nun die Single Source: server/api.js importiert TAG_COLORS hier statt es abzutippen
// (Lib-Enum-Import-Muster aus #304 — die REST-Routen behalten ihre exakten Messages).

import { z } from 'zod'

// Spiegel der bisherigen server/api.js-Inline-Liste. Reihenfolge load-bearing für die
// `color muss einer von …`-Message.
export const TAG_COLORS = ['blue', 'green', 'peach', 'mauve', 'teal', 'overlay0']

const colorEnum = z.enum(TAG_COLORS, { error: `color muss einer von ${TAG_COLORS.join(',')} sein` })

// tag create — name Pflicht + non-empty; color optional (REST-Default 'mauve').
export const tagCreateContract = z.object({
  name: z.string({ error: 'name ist Pflichtfeld' }).trim().min(1, { error: 'name ist Pflichtfeld' }),
  color: colorEnum.optional(),
})

// tag update — beide optional (REST merged mit der existierenden Row); name non-empty wenn gesetzt.
export const tagUpdateContract = z.object({
  name: z.string().trim().min(1, { error: 'name darf nicht leer sein' }).optional(),
  color: colorEnum.optional(),
})

// Issue-Tag-Zuweisung (vollständiger Replace) — tag_ids. Spiegelt PUT /api/backlog/:id/tags.
export const issueTagsContract = z.object({
  tag_ids: z.array(z.coerce.number().int().positive()),
})

// GF-2 Wave D / D1 (D-K): Sprint- + Milestone-Tag-Zuweisung. Identische Shape wie
// issueTagsContract (vollständiger Replace, leer = clear) — additive Junctions
// sprint_tags/milestone_tags. Spiegelt PUT /api/{sprints,milestones}/:id/tags.
export const sprintTagsContract = z.object({
  tag_ids: z.array(z.coerce.number().int().positive()),
})

export const milestoneTagsContract = z.object({
  tag_ids: z.array(z.coerce.number().int().positive()),
})

/** @typedef {z.infer<typeof tagCreateContract>} TagCreateInput */
/** @typedef {z.infer<typeof tagUpdateContract>} TagUpdateInput */
/** @typedef {z.infer<typeof issueTagsContract>} IssueTagsInput */
/** @typedef {z.infer<typeof sprintTagsContract>} SprintTagsInput */
/** @typedef {z.infer<typeof milestoneTagsContract>} MilestoneTagsInput */
