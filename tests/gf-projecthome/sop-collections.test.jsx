import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import SopCollectionsView from '../../src/components/ui/organisms/SopCollectionsView.jsx'

// Fixtures (D-E): SOPs + Collections. Live = Backend-Track T-be2 (Collections-Schema +
// Export/Copy-Endpunkte) — hier NUR präsentational, Fixtures.
const SOPS = [
  { key: 'issues-erfassen', title: 'Issues erfassen', collection: 'c1' },
  { key: 'issue-refinement', title: 'Issue Refinement', collection: 'c1' },
  { key: 'sprint-durchfuehrung', title: 'Sprint durchführen', collection: 'c2' },
]
const COLLECTIONS = [
  { id: 'c1', name: 'Backlog-Pflege', sopKeys: ['issues-erfassen', 'issue-refinement'] },
  { id: 'c2', name: 'Sprint-Flow', sopKeys: ['sprint-durchfuehrung'] },
  { id: 'c3', name: 'Leere Sammlung', sopKeys: [] },
]

const count = (s, sub) => s.split(sub).length - 1

describe('SopCollectionsView — präsentationale SOP-Collections (S3 T1, D-E)', () => {
  test('Wurzel data-ui="sop-collections" (WidgetBase-Shell)', () => {
    const out = html(<SopCollectionsView sops={SOPS} collections={COLLECTIONS} />)
    expect(out).toContain('data-ui="sop-collections"')
  })

  test('SOP-neu-anlegen-Action vorhanden (onCreateSop)', () => {
    const out = html(<SopCollectionsView sops={SOPS} collections={COLLECTIONS} />)
    expect(out).toContain('sop-collections.create')
  })

  test('N .collection == fixture', () => {
    const out = html(<SopCollectionsView sops={SOPS} collections={COLLECTIONS} />)
    expect(count(out, 'sop-collections.collection-')).toBeGreaterThanOrEqual(COLLECTIONS.length)
    expect(out).toContain('sop-collections.collection-c1')
    expect(out).toContain('Backlog-Pflege')
  })

  test('.sop pro Collection (Keys aufgelöst zu Titeln)', () => {
    const out = html(<SopCollectionsView sops={SOPS} collections={COLLECTIONS} />)
    expect(out).toContain('sop-collections.collection-c1.sop-issues-erfassen')
    expect(out).toContain('Issues erfassen')
    expect(count(out, '.sop-')).toBeGreaterThanOrEqual(3)
  })

  test('je Collection 3 Actions: export · copy · linklist', () => {
    const out = html(<SopCollectionsView sops={SOPS} collections={COLLECTIONS} />)
    expect(out).toContain('sop-collections.collection-c1.action.export')
    expect(out).toContain('sop-collections.collection-c1.action.copy')
    expect(out).toContain('sop-collections.collection-c1.action.linklist')
  })

  test('je SOP ein Einsortier-Control (onAssignCollection)', () => {
    const out = html(<SopCollectionsView sops={SOPS} collections={COLLECTIONS} />)
    expect(out).toContain('sop-collections.collection-c1.sop-issues-erfassen.assign')
  })

  test('leere Collection → EmptyState', () => {
    const out = html(<SopCollectionsView sops={SOPS} collections={COLLECTIONS} />)
    expect(out).toContain('sop-collections.collection-c3')
    expect(out).toContain('data-ui="empty-state"')
  })

  test('komplett leer (keine Collections) → EmptyState', () => {
    const out = html(<SopCollectionsView sops={[]} collections={[]} />)
    expect(out).toContain('data-ui="empty-state"')
  })
})
