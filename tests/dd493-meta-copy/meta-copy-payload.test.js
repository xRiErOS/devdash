import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { buildMetaCopyPayload } from '../../apps/frontend/src/lib/metaCopyPayload.js'

// DD-676 supersedes DD-493: the Project-Home meta copy (project-home.meta.copy)
// now emits ONLY Stammdaten + MCP-Abruf hints — NO SSTD slot dump, no prefetch.

const ROOT = resolve(import.meta.dirname, '../..')

function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

const PROJECT = {
  id: 2,
  slug: 'devd',
  name: 'Developer Dashboard',
  prefix: 'DD',
  repo_path: '/repo/devd',
}

describe('DD-676 — buildMetaCopyPayload (Stammdaten + MCP-Abruf, kein SSTD-Dump)', () => {
  test('includes the 5 Stammdaten fields (id/slug/name/prefix/repo)', () => {
    const out = buildMetaCopyPayload(PROJECT)
    expect(out).toMatch(/- ID: 2/)
    expect(out).toMatch(/- Slug: devd/)
    expect(out).toMatch(/- Name: Developer Dashboard/)
    expect(out).toMatch(/- Präfix: DD/)
    expect(out).toMatch(/- Repo: \/repo\/devd/)
  })

  test('has a Projekt-Meta heading', () => {
    expect(buildMetaCopyPayload(PROJECT)).toMatch(/## Projekt-Meta/)
  })

  test('does NOT dump the SSTD slot contents (the DD-676 change)', () => {
    const out = buildMetaCopyPayload(PROJECT)
    expect(out).not.toMatch(/## SSTD/)
    expect(out).not.toMatch(/konnte nicht geladen werden/)
  })

  // ---- MCP-Abruf hints for NSP / Session-Notes / Memories ----
  test('emits an MCP-Abruf section', () => {
    expect(buildMetaCopyPayload(PROJECT)).toMatch(/## MCP-Abruf/)
  })

  test('includes devd_sstd_get for the NSP/Roadmap handoff (slug-scoped)', () => {
    expect(buildMetaCopyPayload(PROJECT)).toMatch(/devd_sstd_get \{ id_or_slug: "devd" \}/)
  })

  test('includes a session_note (Journal) query and a generic memory query', () => {
    const out = buildMetaCopyPayload(PROJECT)
    expect(out).toMatch(/devd_project_memory_query.*category: "session_note"/)
    expect(out).toMatch(/devd_project_memory_query.*q: "<Suchbegriff>"/)
  })

  test('keeps a CLI fallback hint', () => {
    expect(buildMetaCopyPayload(PROJECT)).toMatch(/devd-cli sstd show devd/)
  })

  // ---- reference resolution ----
  test('MCP hints use the slug when present', () => {
    expect(buildMetaCopyPayload(PROJECT)).toMatch(/id_or_slug: "devd"/)
  })

  test('MCP hints fall back to the numeric id when slug is missing', () => {
    const out = buildMetaCopyPayload({ id: 7, name: 'X' })
    expect(out).toMatch(/id_or_slug: "7"/)
  })

  // ---- defensive defaults ----
  test('missing optional fields are simply omitted', () => {
    const out = buildMetaCopyPayload({ id: 5, name: 'X' })
    expect(out).toMatch(/- ID: 5/)
    expect(out).toMatch(/- Name: X/)
    expect(out).not.toMatch(/- Repo:/)
    expect(out).not.toMatch(/- Präfix:/)
  })

  test('empty project → sane heading, no MCP block (no reference available)', () => {
    const out = buildMetaCopyPayload({})
    expect(out).toMatch(/# Projekt — AI-Handoff/)
    expect(out).not.toMatch(/## MCP-Abruf/)
  })
})

describe('DD-676 — OverviewTab.copyMeta wiring (source-grep)', () => {
  const OVERVIEW = 'apps/frontend/src/components/ui/organisms/OverviewTab.jsx'

  test('imports buildMetaCopyPayload', () => {
    expect(src(OVERVIEW)).toMatch(/import \{ buildMetaCopyPayload \} from/)
  })

  test('no longer prefetches the SSTD (the DD-493 GET …/sstd is gone)', () => {
    const s = src(OVERVIEW)
    expect(s).not.toMatch(/fetch\(`\/api\/projects\/\$\{projectId\}\/sstd`/)
    expect(s).not.toMatch(/setSstdContent/)
  })

  test('copyMeta returns the meta payload synchronously from project alone (DD-675/DD-676)', () => {
    const s = src(OVERVIEW)
    const region = s.slice(s.indexOf('const copyMeta'), s.indexOf('const copySummaryContext'))
    expect(region).not.toMatch(/const copyMeta = async/)
    expect(region).not.toMatch(/await /)
    expect(region).toMatch(/return buildMetaCopyPayload\(project\)/)
    expect(region).not.toMatch(/navigator\.clipboard\.writeText/)
  })
})
