import { test, expect, describe } from 'vitest'
import { html } from '../frontend-rework/render.js'
import SstdSlotsWidget from '../../src/components/ui/organisms/SstdSlotsWidget.jsx'

const SLOTS = [
  { key: 'architecture', label: 'Architektur', contentMd: 'Express **5** + better-sqlite3.' },
  { key: 'conventions', label: 'Konventionen', contentMd: 'Conventional Commits, `ps-/pe-`.' },
  { key: 'sprint_state', label: 'Sprint-Stand', contentMd: 'S2 läuft — TodoWidget done.' },
  { key: 'roadmap', label: 'Roadmap', contentMd: 'GF-2 ProjectPages.' },
  { key: 'cross_refs', label: 'Querverweise', contentMd: '' },
  { key: 'misc', label: 'Sonstiges', contentMd: 'Notizen.' },
]
const JOURNAL = ['T2 TodoWidget done', 'T3 SstdSlots in Arbeit']

const count = (s, sub) => s.split(sub).length - 1

describe('SstdSlotsWidget — read-only 6-Slot + Journal (S2 T3)', () => {
  test('Wurzel data-ui="sstd-slots" (WidgetBase-Shell)', () => {
    const out = html(<SstdSlotsWidget slots={SLOTS} journal={JOURNAL} />)
    expect(out).toContain('data-ui="sstd-slots"')
  })

  test('6 .slot, je markiert mit key', () => {
    const out = html(<SstdSlotsWidget slots={SLOTS} journal={JOURNAL} />)
    expect(count(out, 'sstd-slots.slot-')).toBeGreaterThanOrEqual(6)
    for (const s of SLOTS) expect(out).toContain(`sstd-slots.slot-${s.key}`)
  })

  test('Markdown-Anriss gerendert (bold)', () => {
    const out = html(<SstdSlotsWidget slots={SLOTS} journal={JOURNAL} />)
    expect(out).toContain('<strong>5</strong>')
  })

  test('leerer Slot → Placeholder', () => {
    const out = html(<SstdSlotsWidget slots={SLOTS} journal={JOURNAL} />)
    expect(out).toContain('sstd-slots.slot-cross_refs.empty')
  })

  test('read-only: keine Edit-Controls (kein Bearbeiten/Textarea/save)', () => {
    const out = html(<SstdSlotsWidget slots={SLOTS} journal={JOURNAL} />)
    expect(out).not.toContain('slot-section.edit')
    expect(out).not.toContain('Bearbeiten')
    expect(out).not.toContain('<textarea')
  })

  test('Journal-Projektion sichtbar', () => {
    const out = html(<SstdSlotsWidget slots={SLOTS} journal={JOURNAL} />)
    expect(out).toContain('sstd-slots.journal')
    expect(out).toContain('T2 TodoWidget done')
  })

  test('leeres Journal → kein Crash, EmptyState', () => {
    const out = html(<SstdSlotsWidget slots={SLOTS} journal={[]} />)
    expect(out).toContain('sstd-slots.journal')
  })
})
