import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { withProjectSlug } from '../../src/lib/useProjectNav.js'
import { parseEntityId, buildEntitySlug } from '../../src/lib/entitySlug.js'

const ROOT = resolve(import.meta.dirname, '../..')
function src(path) {
  return readFileSync(resolve(ROOT, path), 'utf8')
}

// DD-368 — Slug-basiertes URL-Routing. Unit-Tests für die pure Routing-Logik
// (parser + nav-prefix) plus Source-Scans für ProjectScope, Redirect-Layer und
// den server-seitigen Reserved-Words-Guard.

describe('DD-368 — entitySlug Parser (D04)', () => {
  test('parseEntityId liest führende Ganzzahl, ignoriert -kebab-Suffix', () => {
    expect(parseEntityId('17-project-home-tab')).toBe(17)
    expect(parseEntityId('348-settings-split')).toBe(348)
    expect(parseEntityId('17')).toBe(17)
  })

  test('parseEntityId: ungültige Segmente → null', () => {
    expect(parseEntityId('abc')).toBeNull()
    expect(parseEntityId('')).toBeNull()
    expect(parseEntityId(undefined)).toBeNull()
    expect(parseEntityId(null)).toBeNull()
  })

  test('parseEntityId akzeptiert numerische Eingabe', () => {
    expect(parseEntityId(42)).toBe(42)
  })

  test('buildEntitySlug erzeugt <id>-<kebab>, ohne Titel nur die ID', () => {
    expect(buildEntitySlug(17, 'Project Home Tab')).toBe('17-project-home-tab')
    expect(buildEntitySlug(17)).toBe('17')
    expect(buildEntitySlug(5, '  ')).toBe('5')
  })

  test('Round-trip: buildEntitySlug → parseEntityId ist kanonisch stabil', () => {
    const seg = buildEntitySlug(348, 'Settings Split & More')
    expect(parseEntityId(seg)).toBe(348)
  })
})

describe('DD-368 — withProjectSlug (R01 nav-prefix)', () => {
  test('projekt-gescopete Pfade werden mit dem aktiven Slug prefixt', () => {
    expect(withProjectSlug('/backlog', 'devd')).toBe('/devd/backlog')
    expect(withProjectSlug('/issues/42', 'devd')).toBe('/devd/issues/42')
    expect(withProjectSlug('/', 'devd')).toBe('/devd/board')
  })

  test('Top-Level-Routen (projects/settings/memories) bleiben global', () => {
    expect(withProjectSlug('/projects', 'devd')).toBe('/projects')
    expect(withProjectSlug('/settings/api-keys', 'devd')).toBe('/settings/api-keys')
    expect(withProjectSlug('/memories/global', 'devd')).toBe('/memories/global')
  })

  test('scoped:true erzwingt Prefixing auch für /settings (Projekt-Settings)', () => {
    expect(withProjectSlug('/settings', 'devd', { scoped: true })).toBe('/devd/settings')
  })

  test('global:true unterdrückt Prefixing', () => {
    expect(withProjectSlug('/backlog', 'devd', { global: true })).toBe('/backlog')
  })

  test('bereits gescopete Pfade werden nicht doppelt prefixt', () => {
    expect(withProjectSlug('/devd/backlog', 'devd')).toBe('/devd/backlog')
  })

  test('ohne Slug bleibt der Pfad unverändert (Caller-Fallback)', () => {
    expect(withProjectSlug('/backlog', null)).toBe('/backlog')
  })

  test('externe und relative Pfade bleiben unangetastet', () => {
    expect(withProjectSlug('https://example.org/x', 'devd')).toBe('https://example.org/x')
    expect(withProjectSlug('relative/path', 'devd')).toBe('relative/path')
  })
})

describe('GF-2 _shell/routes Route-Tree (löst DD-368 Legacy-AppShell ab)', () => {
  // Live-Route-Skelett = src/screens/_shell/routes.jsx (Strangler-Bridge); die alte
  // views/AppShell.jsx ist toter Code (T05). board/dependencies + die Legacy-Param-
  // Redirects sind im GF-2-Routen-Vertrag bewusst gedroppt (auf home/projects geleitet).
  const s = src('src/screens/_shell/routes.jsx')

  test('Projekt-Scope-Route /:slug mit ProjectScope-Layout (R02)', () => {
    expect(s).toMatch(/path="\/:slug" element=\{<ProjectScope/)
  })

  test('projekt-gescopete View-Routen vorhanden', () => {
    for (const p of ['home', 'roadmap', 'backlog', 'issues', 'issues/:id', 'sprints', 'sprints/:id', 'review/:sprintId', 'milestones', 'milestones/:id', 'memories', 'settings']) {
      expect(s, `route ${p}`).toContain(`path="${p}"`)
    }
  })

  test('gedroppte Routen board/dependencies leiten auf home (kein eigener Screen)', () => {
    expect(s).toMatch(/path="board"[^>]*Navigate to="home"/)
    expect(s).toMatch(/path="dependencies"[^>]*Navigate to="home"/)
  })

  test('globale Top-Level-Routen ohne Slug (D02)', () => {
    expect(s).toMatch(/path="\/projects"/)
    expect(s).toMatch(/path="\/settings"/)
  })

  test('Root-Redirect "/" + Catch-all → /projects (keine Legacy-Param-Redirects, D06/D07)', () => {
    expect(s).toMatch(/path="\/" element=\{<Navigate to="\/projects" replace/)
    expect(s).toMatch(/path="\*" element=\{<Navigate to="\/projects" replace/)
  })
})

describe('DD-368 — ProjectScope setzt projectStore synchron (R02)', () => {
  const s = src('src/views/ProjectScope.jsx')
  test('setzt ProjectId + Slug und navigiert bei unbekanntem Slug zu /projects', () => {
    expect(s).toMatch(/setActiveProjectId/)
    expect(s).toMatch(/setActiveSlug/)
    expect(s).toMatch(/Navigate to="\/projects" replace/)
    expect(s).toMatch(/Outlet/)
  })
})

describe('DD-368 — Reserved-Words-Guard im Projekt-Create (D05)', () => {
  const s = src('server/api.js')
  test('RESERVED_PROJECT_SLUGS enthält alle globalen Segmente', () => {
    for (const w of ['projects', 'settings', 'dashboard', 'memories', 'assets', 'api', 'ws', 'health', 'ready']) {
      expect(s, w).toContain(`'${w}'`)
    }
  })
  test('POST /api/projects lehnt reservierte Slugs ab', () => {
    expect(s).toMatch(/RESERVED_PROJECT_SLUGS\.has\(slug\)/)
    expect(s).toMatch(/ist reserviert/)
  })
})
