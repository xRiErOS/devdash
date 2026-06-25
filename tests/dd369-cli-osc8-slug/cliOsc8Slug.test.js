// DD-369 — CLI-OSC8-URL-Builder slug-aware (bin/devd-cli.js).
// Source-Presence-Wiring-Test (analog tests/mem17-sstd-cli/sstdCliWiring.test.js).
// Beweist, dass der OSC8-Hyperlink-Builder slug-basierte Pfade emittiert
// (RPD DD-347 E01-Option-b + D03/D04) statt der projekt-losen Legacy-Pfade,
// und dass der Legacy-Pfad als Fallback (D07) erhalten bleibt.

import { describe, expect, test } from 'vitest'
import { readFileSync } from 'fs'

const cli = readFileSync('apps/cli/bin/devd-cli.js', 'utf8')

describe('DD-369 — CLI-OSC8 slug-aware URL-Builder', () => {
  test('scopedLink-Helper + Slug-Cache existieren', () => {
    expect(cli).toMatch(/async function scopedLink\(/)
    expect(cli).toMatch(/async function slugFromEntity\(/)
    expect(cli).toMatch(/async function ensureSlugCache\(/)
  })

  test('slugFromEntity leitet Slug aus project_prefix ODER project_id ab (ohne Extra-Call pro Link)', () => {
    const block = cli.slice(cli.indexOf('async function slugFromEntity('))
    expect(block).toMatch(/project_prefix/)
    expect(block).toMatch(/project_id/)
    // Einmaliger /api/projects-Fetch, prozessweit gecacht.
    expect(cli).toMatch(/_projectSlugCache/)
    expect(cli.slice(cli.indexOf('async function ensureSlugCache('))).toMatch(/\/api\/projects/)
  })

  test('scopedLink emittiert slug-basierte Pfade /:slug/<view>/:id', () => {
    const block = cli.slice(cli.indexOf('async function scopedLink('))
    expect(block).toMatch(/printLink\(`\/\$\{slug\}\/\$\{view\}\/\$\{id\}`\)/)
  })

  test('Fallback ohne Slug → projekt-loser Legacy-Pfad (D07-Redirect-Ziel)', () => {
    const block = cli.slice(cli.indexOf('async function scopedLink('))
    // Legacy-Singular: /sprint/, /review/ bzw. /issues/ Plural.
    expect(block).toMatch(/legacyView/)
    expect(block).toMatch(/printLink\(`\/\$\{legacyView\}\/\$\{fallbackId\}`\)/)
  })

  test('keine projekt-losen printLink-Aufrufe mehr für sprint/issue/review', () => {
    expect(cli).not.toMatch(/printLink\(`\/sprint\//)
    expect(cli).not.toMatch(/printLink\(`\/review\//)
    expect(cli).not.toMatch(/printLink\(`\/issues\//)
  })

  test('View-Plural gemäß D03: issues / sprints / review', () => {
    expect(cli).toMatch(/scopedLink\([^,]+, 'issues',/)
    expect(cli).toMatch(/scopedLink\([^,]+, 'sprints',/)
    expect(cli).toMatch(/scopedLink\([^,]+, 'review',/)
  })

  test('Issue-Pfad nutzt project_number (D04), Sprint/Review die numerische PK', () => {
    // Issue-Verben übergeben project_number als idForPath.
    expect(cli).toMatch(/scopedLink\(it, 'issues', it\.id, it\.project_number\)/)
    expect(cli).toMatch(/scopedLink\(r, 'issues', r\.id, r\.project_number\)/)
    expect(cli).toMatch(/scopedLink\(updated, 'issues', updated\.id, updated\.project_number\)/)
    // Sprint/Review nutzen s.id (kein idForPath).
    expect(cli).toMatch(/scopedLink\(s, 'sprints', s\.id\)/)
    expect(cli).toMatch(/scopedLink\(s, 'review', s\.id\)/)
  })

  test('DEVD_UI_URL-Default unverändert', () => {
    expect(cli).toMatch(/DEVD_UI_URL\s*=\s*\(process\.env\.DEVD_UI_URL \|\| 'https:\/\/devdash\.familie-riedel\.org'\)/)
  })
})
