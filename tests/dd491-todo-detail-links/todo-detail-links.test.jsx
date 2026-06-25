// DD-491 (T06) — Todo-Detail-Links rendern typ-korrekt durch die KANONISCHE
// Kette ChecklistDetailModal → TodoLinksList → LinkRow (kein zweiter, divergenter
// Inline-Renderer mehr). Akzeptanz: obsidian://-Links als decodierter Note-Name +
// <a href="obsidian://...">, Files/URLs klickbar im Browser, Issue-Pill delegiert.
//
// SSR-only (renderToStaticMarkup, Node-Env wie t03-todo-components-ssr) — die
// Markup-Assertions reichen, weil die Typ-Verzweigung rein deklarativ ist.

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TodoLinksList from '../../apps/frontend/src/components/ui/organisms/TodoLinksList.jsx'
import ChecklistDetailModal from '../../apps/frontend/src/components/ui/organisms/ChecklistDetailModal.jsx'

const noop = () => {}

const OBSIDIAN_TARGET = 'obsidian://open?vault=Vault&file=DevD%20Setup'
// SSR escapt `&` in Attributwerten zu `&amp;` — die href-Assertions matchen die escapte Form.
const OBSIDIAN_HREF = 'obsidian://open?vault=Vault&amp;file=DevD%20Setup'
const ALL_LINK_TYPES = [
  { id: 1, type: 'spec', target: 'specs/03-ADR/ADR-007.md', position: 1 },
  { id: 2, type: 'issue', target: 'DD-481', position: 2 },
  { id: 3, type: 'vault', target: 'SOP - Sprint Durchfuehrung', position: 3 },
  { id: 4, type: 'url', target: 'https://github.com/xRiErOS/DeveloperDashboard', position: 4 },
  { id: 5, type: 'vault', target: OBSIDIAN_TARGET, position: 5 },
]

describe('DD-491 — TodoLinksList (kanonischer Renderer)', () => {
  test('obsidian://-Link: decodierter Note-Name als Text + <a href="obsidian://...">', () => {
    const html = renderToStaticMarkup(
      <TodoLinksList links={[{ id: 5, type: 'vault', target: OBSIDIAN_TARGET }]} onRemoveLink={noop} />,
    )
    // href bleibt die volle obsidian://-URI (SSR-escaped &amp;)
    expect(html).toContain(`href="${OBSIDIAN_HREF}"`)
    // Text ist der decodierte file=-Note-Name (DevD Setup), NICHT die rohe URL
    expect(html).toContain('>DevD Setup<')
    expect(html).not.toContain('>obsidian://')
    // als echter Anker gerendert (LinkRow href-Pfad)
    expect(html).toMatch(/<a[^>]+href="obsidian:\/\//)
  })

  test('url-Link (http(s)): klickbarer <a href> im Browser', () => {
    const url = 'https://example.com/page'
    const html = renderToStaticMarkup(
      <TodoLinksList links={[{ id: 4, type: 'url', target: url }]} onRemoveLink={noop} />,
    )
    expect(html).toContain(`href="${url}"`)
    expect(html).toMatch(/<a[^>]+href="https:\/\/example\.com\/page"/)
  })

  test('vault-Link (kein obsidian://): [[ ]]-gewrappt, NICHT klickbar (kein href)', () => {
    const html = renderToStaticMarkup(
      <TodoLinksList links={[{ id: 3, type: 'vault', target: 'My Note' }]} onRemoveLink={noop} />,
    )
    expect(html).toContain('[[My Note]]')
    // reiner Text-Pfad von LinkRow → kein <a href>
    expect(html).not.toContain('<a ')
  })

  test('issue-Link: ohne href (Klick wird am <li> delegiert), als Cursor-pointer markiert', () => {
    const html = renderToStaticMarkup(
      <TodoLinksList links={[{ id: 2, type: 'issue', target: 'DD-123' }]} onRemoveLink={noop} onIssueClick={noop} />,
    )
    expect(html).toContain('>DD-123<')
    expect(html).not.toContain('[[DD-123]]')
    // Issue-Label ist KEIN <a href> — der Klick läuft am <li> (cursor-pointer)
    expect(html).toContain('cursor-pointer')
    expect(html).not.toMatch(/<a[^>]+>DD-123</)
  })

  test('Empty-State zeigt Hinweis statt Liste', () => {
    const html = renderToStaticMarkup(<TodoLinksList links={[]} onRemoveLink={noop} />)
    expect(html).toContain('Keine verlinkten Dokumente')
  })

  test('alle 4 Typen + obsidian gemischt: je eine LinkRow mit korrektem data-link-type', () => {
    const html = renderToStaticMarkup(
      <TodoLinksList links={ALL_LINK_TYPES} onRemoveLink={noop} onIssueClick={noop} />,
    )
    for (const t of ['spec', 'issue', 'vault', 'url']) {
      expect(html).toContain(`data-link-type="${t}"`)
    }
    // obsidian + url klickbar, spec/vault(non-obsidian) nicht
    expect(html).toContain(`href="${OBSIDIAN_HREF}"`)
    expect(html).toContain('href="https://github.com/xRiErOS/DeveloperDashboard"')
  })
})

describe('DD-491 — ChecklistDetailModal routet Links durch kanonische TodoLinksList', () => {
  const ITEM = {
    id: 42,
    label: 'Migration ausrollen',
    details: 'Schritt für Schritt',
    status: 'open',
    created_at: '2026-05-20 10:00:00',
    updated_at: '2026-05-22 14:00:00',
    links: ALL_LINK_TYPES,
  }

  test('rendert die kanonische LinkRow-Kette (data-ui="link-row") statt Inline-Markup', () => {
    const html = renderToStaticMarkup(
      <ChecklistDetailModal item={ITEM} open onClose={noop} onPatch={noop} onAddLink={noop} onRemoveLink={noop} onOpenIssue={noop} />,
    )
    // kanonische LinkRow-Molecule (Beweis: Routing durch TodoLinksList → LinkRow)
    expect(html).toContain('data-ui="link-row"')
    // data-ui-Scope der Liste bleibt unter checklist-detail-modal.links erhalten
    expect(html).toContain('data-ui="checklist-detail-modal.links"')
  })

  test('obsidian-Link im Modal: decodierter Note-Name + obsidian:// href', () => {
    const html = renderToStaticMarkup(
      <ChecklistDetailModal item={ITEM} open onClose={noop} onPatch={noop} onAddLink={noop} onRemoveLink={noop} onOpenIssue={noop} />,
    )
    expect(html).toContain(`href="${OBSIDIAN_HREF}"`)
    expect(html).toContain('>DevD Setup<')
  })

  test('url-Link im Modal: klickbarer Browser-<a href>', () => {
    const html = renderToStaticMarkup(
      <ChecklistDetailModal item={ITEM} open onClose={noop} onPatch={noop} onAddLink={noop} onRemoveLink={noop} onOpenIssue={noop} />,
    )
    expect(html).toContain('href="https://github.com/xRiErOS/DeveloperDashboard"')
  })

  test('issue-Link im Modal: DD-481 sichtbar, ohne eigenen <a href>', () => {
    const html = renderToStaticMarkup(
      <ChecklistDetailModal item={ITEM} open onClose={noop} onPatch={noop} onAddLink={noop} onRemoveLink={noop} onOpenIssue={noop} />,
    )
    expect(html).toContain('DD-481')
    expect(html).not.toMatch(/<a[^>]+>DD-481</)
  })
})
