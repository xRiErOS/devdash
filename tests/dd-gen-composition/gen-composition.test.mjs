/**
 * gen-composition — Contract des MDX-Mermaid-Generators. Reine Funktionen +
 * ein realer buildGraph-Lauf gegen ChildWidget (stabile Komposition).
 */
import { test, expect } from 'vitest'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import {
  classifyImport, buildGraph, toMermaid, updateMdxBlock, ensureSection,
  componentPathForMdx, toUsedByMarkdown, updateUsedByBlock,
} from '../../apps/frontend/scripts/gen-composition.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const ui = (p) => resolve(here, '../../apps/frontend/src/ui', p)

test('classifyImport: Tier aus ui-Pfad', () => {
  expect(classifyImport('/x/src/ui/atoms/Button.jsx')).toBe('atom')
  expect(classifyImport('/x/src/ui/molecules/FormField.jsx')).toBe('molecule')
  expect(classifyImport('/x/src/ui/organisms/complex/Toast.jsx')).toBe('organism')
  expect(classifyImport('/x/src/ui/organisms/base/PageTitle.jsx')).toBe('organism')
  expect(classifyImport('/x/src/ui/screens/IssueDetails.jsx')).toBe('screen')
})

test('classifyImport: foundations/extern → ignore', () => {
  expect(classifyImport('/x/src/ui/foundations/Icon.jsx')).toBe('ignore')
  expect(classifyImport('lucide-react')).toBe('ignore')
})

test('buildGraph: reale Komposition ChildWidget (Atoms bleiben, transitiv)', async () => {
  const g = await buildGraph(ui('organisms/complex/ChildWidget.jsx'))
  expect(g.nodes.get('ChildWidget').tier).toBe('organism')
  expect(g.nodes.get('WidgetBase').tier).toBe('molecule')
  expect(g.nodes.get('EntityId').tier).toBe('atom')
  expect(g.edges.has('ChildWidget-->WidgetBase')).toBe(true)
  expect(g.edges.has('ChildWidget-->ListItem')).toBe(true)
  expect(g.edges.has('ChildWidget-->EntityId')).toBe(true)
})

test('toMermaid: deterministisch sortiert, classDefs + class-Zuweisung', async () => {
  const g = await buildGraph(ui('organisms/complex/ChildWidget.jsx'))
  const out = toMermaid(g)
  expect(out.startsWith('graph TD')).toBe(true)
  // Kanten alphabetisch
  const edgeLines = out.split('\n').filter((l) => l.includes('-->'))
  expect([...edgeLines]).toEqual([...edgeLines].sort())
  expect(out).toContain('classDef atom fill:#f2cdcd,stroke:#1e1e2e,color:#1e1e2e')
  expect(out).toContain('class ChildWidget organism')
})

test('toMermaid: kantenloser Graph zeichnet Einzelknoten', () => {
  const out = toMermaid({ nodes: new Map([['Solo', { tier: 'molecule' }]]), edges: new Set() })
  expect(out).toContain('\n  Solo')
  expect(out).toContain('class Solo molecule')
})

test('updateMdxBlock: ersetzt Fence-Block, idempotent, ohne Marker unverändert', () => {
  const mdx = `# Doc\n\n{/* AUTOGEN:composition START */}\n\`\`\`mermaid\ngraph TD\n  OLD --> STALE\n\`\`\`\n{/* AUTOGEN:composition END */}\n\nRest.`
  const next = 'graph TD\n  A --> B'
  const once = updateMdxBlock(mdx, next)
  expect(once).toContain('A --> B')
  expect(once).not.toContain('STALE')
  expect(once).toContain('```mermaid')
  expect(updateMdxBlock(once, next)).toBe(once)
  expect(updateMdxBlock('# kein marker', next)).toBe('# kein marker')
})

test('ensureSection: setzt Sektion vor data-ui-Anker, idempotent', () => {
  const mdx = '# Doc\n\n## data-ui-Anker\n\nTabelle.\n'
  const out = ensureSection(mdx)
  expect(out).toContain('## Abhängigkeiten (Komposition)')
  expect(out.indexOf('## Abhängigkeiten')).toBeLessThan(out.indexOf('## data-ui-Anker'))
  expect(out).toContain('{/* AUTOGEN:composition START */}')
  expect(ensureSection(out)).toBe(out)
})

test('ensureSection: ohne Anker an Dateiende', () => {
  const out = ensureSection('# Doc\n\nNur Text.\n')
  expect(out.trimEnd().endsWith('{/* AUTOGEN:composition END */}')).toBe(true)
})

test('componentPathForMdx: co-located Basisname.jsx', () => {
  expect(componentPathForMdx('/r/src/ui/molecules/FormField.mdx'))
    .toBe('/r/src/ui/molecules/FormField.jsx')
  expect(componentPathForMdx('/r/src/ui/organisms/base/PageTitle.mdx'))
    .toBe('/r/src/ui/organisms/base/PageTitle.jsx')
})

test('toUsedByMarkdown + updateUsedByBlock', () => {
  expect(toUsedByMarkdown([{ id: 'IssueDetails', tier: 'screen' }]))
    .toBe('- `IssueDetails` (screen)')
  expect(toUsedByMarkdown([])).toBe('_Nirgends komponiert (noch ungenutzt)._')
  const mdx = '{/* AUTOGEN:usedby START */}\n- `OLD`\n{/* AUTOGEN:usedby END */}'
  const once = updateUsedByBlock(mdx, '- `A` (screen)')
  expect(once).toContain('- `A` (screen)')
  expect(once).not.toContain('OLD')
  expect(updateUsedByBlock('# kein marker', 'x')).toBe('# kein marker')
})
