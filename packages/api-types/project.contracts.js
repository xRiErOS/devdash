// @ts-check
// Autoritatives Zod-Contract-Modul für Projekt-Payloads (DD2). Single Source of
// Truth — alle Gateways leiten hieraus ab statt zu triplizieren:
//
//   - MCP  (mcp/devd-mcp.js) : inputSchema = { ...projectCreateContract.shape }
//   - REST (src/api.js)      : projectCreateContract.safeParse(req.body)
//
// Struktur/Typ/Required leben hier; Business-Regeln (RESERVED_PROJECT_SLUGS,
// UNIQUE-409, id=1-Löschsperre) bleiben in src/api.js.

import { z } from 'zod'

// slug: erstes Pfad-Segment → nur Kleinbuchstaben/Ziffern/Bindestrich, treibt
// Routing/MCP-Slug-Lookup. Änderbar seit DD2-232 (vormals immutable) — Issue-
// Keys hängen NICHT am slug (nur am prefix), Routing-Bookmarks können brechen.
const projectSlug = z
  .string({ error: 'slug ist Pflichtfeld' })
  .trim()
  .regex(/^[a-z0-9-]+$/, { error: 'slug nur a-z 0-9 - erlaubt' })

// prefix: 2-6 Großbuchstaben/Ziffern, treibt die Issue-Keys (z.B. DD2-7). Keys
// werden live aus project.prefix + project_number berechnet (nie in der DB
// dupliziert, s. api.js `key = \`${project_prefix}-${project_number}\``) — eine
// Prefix-Änderung (DD2-232) braucht daher KEINEN Rewrite bestehender Zeilen.
const projectPrefix = z
  .string({ error: 'prefix ist Pflichtfeld' })
  .trim()
  .regex(/^[A-Z0-9]{2,6}$/, { error: 'prefix 2-6 Großbuchstaben/Ziffern' })

const projectName = z
  .string({ error: 'name ist Pflichtfeld' })
  .trim()
  .min(1, { error: 'name ist Pflichtfeld' })

// project create — slug/name/prefix Pflicht; description/color/repo_path optional.
// REST defaultet fehlende Optionals (color → '#cba6f7', Rest → NULL).
export const projectCreateContract = z.object({
  slug: projectSlug,
  name: projectName,
  prefix: projectPrefix,
  description: z.string().nullish(),
  color: z.string().nullish(),
  repo_path: z.string().nullish(),
})

/** @typedef {z.infer<typeof projectCreateContract>} ProjectCreateInput */

// project update — slug/prefix optional (DD2-232, PO-Freigabe aus DD2-221-Review
// I02): nur validiert, wenn im Body vorhanden. Übrige Update-Felder (name, color,
// …) bleiben in src/api.js lose typisiert (Bestand, keine Vollumstellung hier).
export const projectUpdateContract = z.object({
  slug: projectSlug.optional(),
  prefix: projectPrefix.optional(),
})

/** @typedef {z.infer<typeof projectUpdateContract>} ProjectUpdateInput */
