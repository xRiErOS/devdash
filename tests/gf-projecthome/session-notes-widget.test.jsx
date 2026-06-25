import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import SessionNotesWidget from '../../src/components/ui/organisms/SessionNotesWidget.jsx'

const NOTES = [
  {
    id: 'sn-1',
    title: 'S2 TodoWidget realisiert',
    detailMd: 'WidgetBase-Slot-Widget mit **Copy-ID**.',
    pr: 'https://github.com/x/y/pull/148',
    sprints: ['DD#47'],
    issues: ['DD-678', 'GF-433'],
  },
  {
    id: 'sn-2',
    title: 'PO-Drift geklärt',
    detailMd: 'slot.sessionnotes raus, Tabs → S3.',
    sprints: [],
    issues: ['GF-413'],
  },
  {
    id: 'sn-3',
    title: 'Langer Eintrag (500-Clamp)',
    detailMd: 'a'.repeat(500) + 'TAILSENTINEL_ABGESCHNITTEN',
  },
]

const count = (s, sub) => s.split(sub).length - 1

describe('SessionNotesWidget — durchsuchbare Notiz-Liste (S2 T4, D-D)', () => {
  test('Wurzel data-ui="session-notes" (WidgetBase-Shell)', () => {
    const out = html(<SessionNotesWidget notes={NOTES} />)
    expect(out).toContain('data-ui="session-notes"')
  })

  test('Such-Input vorhanden (.search)', () => {
    const out = html(<SessionNotesWidget notes={NOTES} query="" />)
    expect(out).toContain('session-notes.search')
  })

  test('N .item == fixture', () => {
    const out = html(<SessionNotesWidget notes={NOTES} />)
    expect(count(out, 'session-notes.item-')).toBeGreaterThanOrEqual(NOTES.length)
    expect(out).toContain('session-notes.item-sn-1')
  })

  test('Note zeigt ID, PR-Link, Sprint- + Issue-Chips', () => {
    const out = html(<SessionNotesWidget notes={NOTES} />)
    expect(out).toContain('session-notes.item-sn-1.id')
    expect(out).toContain('session-notes.item-sn-1.pr')
    expect(out).toContain('DD#47') // sprint chip
    expect(out).toContain('DD-678') // issue chip
  })

  test('Detail-Anriss auf ≤500 Zeichen geclippt', () => {
    const out = html(<SessionNotesWidget notes={NOTES} />)
    expect(out).toContain('session-notes.item-sn-3.detail')
    expect(out).not.toContain('TAILSENTINEL_ABGESCHNITTEN')
  })

  test('leere Liste → EmptyState', () => {
    const out = html(<SessionNotesWidget notes={[]} query="suchbegriff" />)
    expect(out).toContain('data-ui="empty-state"')
    expect(out).toContain('session-notes.search')
  })

  test('selectedId markiert das Item (aria-current)', () => {
    const out = html(<SessionNotesWidget notes={NOTES} selectedId="sn-2" />)
    expect(out).toContain('aria-current="true"')
  })
})
