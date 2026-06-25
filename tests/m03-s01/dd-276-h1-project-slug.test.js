import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// DD-276 — Statischer Check: H1 in Hauptviews zeigt Projekt-Slug-Suffix.
// (Volle render-test mit @testing-library nicht installiert — Source-Scan reicht
// als Acceptance-Beweis für die Convention.)

const ROOT = resolve(import.meta.dirname, '../..')

// DD-510 (DD#62): TimelineMode + 3-Modi-Container gelöscht; der H1-/Slug-Vertrag
// lebt jetzt im Spalten-Board (src/views/RoadmapBoard.jsx, nicht-embedded-Pfad —
// die <h1> mit `· {activeProject.slug}` rendert nur wenn embedded=false).
const FILES_WITH_H1_PROJECT_SUFFIX = [
  'src/views/BacklogPage.jsx',
  'src/views/RoadmapBoard.jsx',
]

describe('DD-276 — Page-Title-Konvention (H1 + Projekt-Slug-Suffix)', () => {
  test.each(FILES_WITH_H1_PROJECT_SUFFIX)('%s importiert useActiveProject + useDocumentTitle', (path) => {
    const src = readFileSync(resolve(ROOT, path), 'utf8')
    expect(src).toMatch(/useActiveProject/)
    expect(src).toMatch(/useDocumentTitle/)
  })

  test.each(FILES_WITH_H1_PROJECT_SUFFIX)('%s rendert activeProject.slug im H1-Block', (path) => {
    const src = readFileSync(resolve(ROOT, path), 'utf8')
    expect(src).toMatch(/activeProject\?\.slug/)
  })

  test('hooks/useActiveProject exportiert beide Hooks + Cache-Helper', () => {
    const src = readFileSync(resolve(ROOT, 'src/hooks/useActiveProject.js'), 'utf8')
    expect(src).toMatch(/export function useActiveProject/)
    expect(src).toMatch(/export function useDocumentTitle/)
    expect(src).toMatch(/export function clearActiveProjectCache/)
  })

  test('useDocumentTitle setzt document.title nach Pattern "DevD — <page> · <slug>"', () => {
    const src = readFileSync(resolve(ROOT, 'src/hooks/useActiveProject.js'), 'utf8')
    expect(src).toMatch(/document\.title\s*=\s*slug\s*\?\s*`DevD — \$\{page\} · \$\{slug\}`/)
  })
})
