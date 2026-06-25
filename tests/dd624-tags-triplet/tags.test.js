// DD-624: Tags-Triplet — Tag-Verwaltung über CLI + MCP auf Basis von contracts/tag.contracts.js.
// Contract ist funktional testbar (kein Server-Start). REST existierte bereits; CLI/MCP
// gespiegelt → Source-Presence-Wiring. TAG_COLORS Single Source (api.js importiert).

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { TAG_COLORS, tagCreateContract, tagUpdateContract, issueTagsContract } from '../../contracts/tag.contracts.js'

describe('DD-624 — Tag-Contract', () => {
  test('TAG_COLORS spiegelt die 6 sanktionierten Farben', () => {
    expect(TAG_COLORS).toEqual(['blue', 'green', 'peach', 'mauve', 'teal', 'overlay0'])
  })

  test('tagCreate: name Pflicht, color optional + Enum-validiert', () => {
    expect(tagCreateContract.safeParse({ name: 'urgent' }).success).toBe(true)
    expect(tagCreateContract.safeParse({ name: 'urgent', color: 'peach' }).success).toBe(true)
    expect(tagCreateContract.safeParse({ name: '' }).success).toBe(false)
    expect(tagCreateContract.safeParse({ name: 'x', color: 'pink' }).success).toBe(false)
    expect(tagCreateContract.safeParse({ color: 'blue' }).success).toBe(false)
  })

  test('tagUpdate: beide optional, name non-empty wenn gesetzt', () => {
    expect(tagUpdateContract.safeParse({}).success).toBe(true)
    expect(tagUpdateContract.safeParse({ color: 'teal' }).success).toBe(true)
    expect(tagUpdateContract.safeParse({ name: '' }).success).toBe(false)
  })

  test('issueTags: tag_ids-Array aus positiven Ganzzahlen (coerce)', () => {
    expect(issueTagsContract.safeParse({ tag_ids: [1, 2, 3] }).success).toBe(true)
    expect(issueTagsContract.safeParse({ tag_ids: ['4', '5'] }).success).toBe(true) // coerce
    expect(issueTagsContract.safeParse({ tag_ids: [] }).success).toBe(true) // leer = clear
    expect(issueTagsContract.safeParse({ tag_ids: [-1] }).success).toBe(false)
  })
})

describe('DD-624 — Wiring', () => {
  const api = readFileSync('server/api.js', 'utf8')
  const cli = readFileSync('bin/devd-cli.js', 'utf8')
  const mcp = readFileSync('mcp/devd-mcp.js', 'utf8')

  test('api.js single-sourced TAG_COLORS aus dem Contract (keine Inline-Array-Dup)', () => {
    expect(api).toMatch(/import \{ TAG_COLORS as TAG_COLORS_CONTRACT \} from '\.\.\/contracts\/tag\.contracts\.js'/)
    expect(api).not.toMatch(/const TAG_COLORS = \['blue','green','peach','mauve','teal','overlay0'\]/)
  })

  test('CLI exposes tag list/create/update/delete + issue tag-set/tag-remove', () => {
    for (const c of ["'tag:list'", "'tag:create'", "'tag:update'", "'tag:delete'", "'issue:tag-set'", "'issue:tag-remove'"]) {
      expect(cli).toContain(c)
    }
    expect(cli).toMatch(/parseOrThrow\(tagCreateContract/)
    expect(cli).toMatch(/parseOrThrow\(issueTagsContract/)
  })

  test('MCP registers devd_tag_* + devd_issue_tag_set/remove', () => {
    for (const t of ['devd_tag_list', 'devd_tag_create', 'devd_tag_update', 'devd_tag_delete', 'devd_issue_tag_set', 'devd_issue_tag_remove']) {
      expect(mcp).toContain(`'${t}'`)
    }
    expect(mcp).toMatch(/z\.enum\(TAG_COLORS\)/)
  })

  test('tag-set/remove gehen über PUT /api/backlog/:id/tags (REST-Replace)', () => {
    expect(cli).toMatch(/'PUT', `\/api\/backlog\/\$\{id\}\/tags`/)
    expect(mcp).toMatch(/'PUT', `\/api\/backlog\/\$\{issueId\}\/tags`/)
  })
})
