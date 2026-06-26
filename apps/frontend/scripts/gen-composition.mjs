/**
 * gen-composition — Mermaid-Kompositionsdiagramme aus echten JSX-Importen.
 *
 * Portiert aus DeveloperDashboard_Archiv/scripts/gen-composition.mjs auf den
 * Monorepo-Stand (co-located `src/ui/<tier>/`, native ```mermaid-Fences via
 * rehype-mermaid statt `<Composition>`-Wrapper).
 *
 * Quelle der Wahrheit = der reale Import-Baum. Diagramme werden NIE händisch
 * gepflegt, sondern zwischen `{/* AUTOGEN:composition START *​/}` … `END` in die
 * Begleit-MDX geschrieben. Idempotenz (render(x) === x) trägt den `--check`-Gate.
 *
 *   node scripts/gen-composition.mjs          # MDX-Blöcke schreiben/scaffolden
 *   node scripts/gen-composition.mjs --check   # Drift-Check (Exit 1), kein Write
 */
import { init, parse } from 'es-module-lexer'
import { transform } from 'esbuild'
import { readFile, writeFile, glob } from 'node:fs/promises'
import { dirname, resolve, relative, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

// ── Tier-Klassifikation: Pfad = Wahrheit ──────────────────────────────────────
// foundations/lib/extern = ignore (Primitive/Tokens, keine Komposition nach unten).
export function classifyImport(resolvedPath) {
  if (resolvedPath.includes('/ui/atoms/')) return 'atom'
  if (resolvedPath.includes('/ui/molecules/')) return 'molecule'
  if (resolvedPath.includes('/ui/organisms/')) return 'organism'
  if (resolvedPath.includes('/ui/screens/')) return 'screen'
  return 'ignore'
}

const nodeId = (filePath) => basename(filePath, extname(filePath))

async function importsOf(filePath) {
  await init
  let src
  try {
    src = await readFile(filePath, 'utf8')
  } catch (e) {
    throw new Error(`gen-composition: importierte Datei nicht lesbar: ${filePath} (${e.code || e.message})`)
  }
  let code
  try {
    ;({ code } = await transform(src, { loader: 'jsx' }))
  } catch (e) {
    throw new Error(`gen-composition: JSX-Transform fehlgeschlagen für ${filePath}: ${e.message}`)
  }
  const [imps] = parse(code)
  const out = []
  for (const imp of imps) {
    const spec = imp.n
    if (!spec || !spec.startsWith('.')) continue
    out.push(resolve(dirname(filePath), spec))
  }
  return out
}

// BFS über den Import-Baum. Entry-Tier aus Pfad; ignore-Knoten (foundations) raus.
// Atoms BLEIBEN (anders als die Alt-Version) — sonst wären Molecule-Graphen leer.
export async function buildGraph(entryFile) {
  const nodes = new Map()
  const edges = new Set()
  const visited = new Set()
  const entryId = nodeId(entryFile)
  nodes.set(entryId, { tier: classifyImport(entryFile) === 'ignore' ? 'organism' : classifyImport(entryFile) })
  const queue = [entryFile]
  while (queue.length) {
    const file = queue.shift()
    if (visited.has(file)) continue
    visited.add(file)
    const fromId = nodeId(file)
    for (const childPath of await importsOf(file)) {
      const tier = classifyImport(childPath)
      if (tier === 'ignore') continue
      const toId = nodeId(childPath)
      if (!nodes.has(toId)) nodes.set(toId, { tier })
      edges.add(`${fromId}-->${toId}`)
      if (!visited.has(childPath)) queue.push(childPath)
    }
  }
  return { nodes, edges }
}

const TIER_FILL = {
  screen: '#cba6f7',   // mauve
  organism: '#89b4fa', // blue
  molecule: '#a6e3a1', // green
  atom: '#f2cdcd',     // flamingo
}

export function toMermaid(graph) {
  const lines = ['graph TD']
  const edges = [...graph.edges].sort()
  for (const e of edges) {
    const [from, to] = e.split('-->')
    lines.push(`  ${from} --> ${to}`)
  }
  // Knoten ohne Kante (z.B. Wurzel ohne Tier-Kinder) trotzdem zeichnen.
  if (!edges.length) {
    for (const id of [...graph.nodes.keys()].sort()) lines.push(`  ${id}`)
  }
  const byTier = (t) =>
    [...graph.nodes.entries()].filter(([, v]) => v.tier === t).map(([id]) => id).sort()
  // Mermaid-classDef akzeptiert kein var() (Klammer bricht Parse) → fixe Hex.
  // Heller Fill + dunkler Text = in Latte UND Macchiato lesbar (Catppuccin).
  for (const [tier, fill] of Object.entries(TIER_FILL)) {
    lines.push(`  classDef ${tier} fill:${fill},stroke:#1e1e2e,color:#1e1e2e`)
  }
  for (const tier of Object.keys(TIER_FILL)) {
    const ids = byTier(tier)
    if (ids.length) lines.push(`  class ${ids.join(',')} ${tier}`)
  }
  return lines.join('\n')
}

export async function buildMermaid(entryFile) {
  return toMermaid(await buildGraph(entryFile))
}

// ── Reverse-Deps („Verwendet in") ─────────────────────────────────────────────
// Scope: Targets = Molecules/Organismen; mögliche Nutzer = Organismen + Screens.
const USEDBY_PARENT_GLOBS = [
  'src/ui/organisms/**/*.jsx',
  'src/ui/screens/**/*.jsx',
]

function tierOfPath(file) {
  if (file.includes('/ui/organisms/')) return 'organism'
  if (file.includes('/ui/screens/')) return 'screen'
  if (file.includes('/ui/molecules/')) return 'molecule'
  return 'other'
}

function importPointsTo(resolvedImport, target) {
  return resolvedImport === target
    || `${resolvedImport}.jsx` === target
    || `${resolvedImport}.js` === target
}

export async function buildUsedBy(targetFile, repoRoot) {
  const target = resolve(targetFile)
  const users = new Map()
  for (const pattern of USEDBY_PARENT_GLOBS) {
    for await (const rel of glob(pattern, { cwd: repoRoot })) {
      const file = resolve(repoRoot, rel)
      if (file === target) continue
      if (/\.(stories|test)\./.test(file)) continue
      let imps
      try { imps = await importsOf(file) } catch { continue }
      if (imps.some((p) => importPointsTo(p, target))) {
        users.set(nodeId(file), tierOfPath(file))
      }
    }
  }
  return [...users.entries()]
    .map(([id, tier]) => ({ id, tier }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export function toUsedByMarkdown(users) {
  if (!users.length) return '_Nirgends komponiert (noch ungenutzt)._'
  return users.map((u) => `- \`${u.id}\` (${u.tier})`).join('\n')
}

const USEDBY_START = '{/* AUTOGEN:usedby START */}'
const USEDBY_END = '{/* AUTOGEN:usedby END */}'

export function updateUsedByBlock(content, markdown) {
  const s = content.indexOf(USEDBY_START)
  const e = content.indexOf(USEDBY_END)
  if (s === -1 || e === -1 || e < s) return content
  const block = `${USEDBY_START}\n${markdown}\n${USEDBY_END}`
  return content.slice(0, s) + block + content.slice(e + USEDBY_END.length)
}

// ── Composition-Block (native ```mermaid-Fence für rehype-mermaid) ─────────────
const START = '{/* AUTOGEN:composition START */}'
const END = '{/* AUTOGEN:composition END */}'

export function updateMdxBlock(content, mermaid) {
  const s = content.indexOf(START)
  const e = content.indexOf(END)
  if (s === -1 || e === -1 || e < s) return content
  const block = `${START}\n\`\`\`mermaid\n${mermaid}\n\`\`\`\n${END}`
  return content.slice(0, s) + block + content.slice(e + END.length)
}

// Co-located: gleiche Ablage, gleicher Basisname. `Foo.mdx` → `Foo.jsx` daneben.
export function componentPathForMdx(mdxPath) {
  const name = basename(mdxPath, '.mdx')
  return resolve(dirname(mdxPath), `${name}.jsx`)
}

// Fehlt der AUTOGEN-Block, Sektion vor „## data-ui-Anker" einsetzen (sonst ans Ende).
const SECTION = `## Abhängigkeiten (Komposition)\n\n${START}\n${END}`

export function ensureSection(content) {
  if (content.includes(START)) return content
  const anchor = content.indexOf('## data-ui-Anker')
  const block = `${SECTION}\n\n`
  if (anchor !== -1) return content.slice(0, anchor) + block + content.slice(anchor)
  return `${content.replace(/\s*$/, '')}\n\n${block}`.replace(/\s*$/, '') + '\n'
}

// Voller Render-Schritt: Sektion sicherstellen + Diagramm setzen (+ usedby falls Marker).
export async function renderMdx(content, mdxPath, repoRoot) {
  const withSection = ensureSection(content)
  const component = componentPathForMdx(mdxPath)
  let next = updateMdxBlock(withSection, await buildMermaid(component))
  if (next.includes(USEDBY_START)) {
    next = updateUsedByBlock(next, toUsedByMarkdown(await buildUsedBy(component, repoRoot)))
  }
  return next
}

// Tracked-Tiers: Molecules + Organismen + Screens (Atoms/Foundations haben keine
// Tier-Kinder → kein Komposition-Block).
const MDX_GLOBS = [
  'src/ui/molecules/**/*.mdx',
  'src/ui/organisms/**/*.mdx',
  'src/ui/screens/**/*.mdx',
]

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isMain) {
  const check = process.argv.includes('--check')
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  let changed = 0
  const drift = []
  for (const pattern of MDX_GLOBS) {
    for await (const rel of glob(pattern, { cwd: repoRoot })) {
      const mdxPath = resolve(repoRoot, rel)
      const content = await readFile(mdxPath, 'utf8')
      let next
      try {
        next = await renderMdx(content, mdxPath, repoRoot)
      } catch (e) {
        console.error(`gen:composition — Fehler bei ${rel}: ${e.message}`)
        process.exit(2)
      }
      if (next === content) continue
      if (check) { drift.push(rel) } else { await writeFile(mdxPath, next); changed++ }
    }
  }
  if (check) {
    if (drift.length) {
      console.error(`gen:composition --check — Drift in ${drift.length} Datei(en):`)
      for (const r of drift) console.error(`  ${r}`)
      console.error('Fix: npm run gen:composition')
      process.exit(1)
    }
    console.log('gen:composition --check — kein Drift')
  } else {
    console.log(`gen:composition — ${changed} Datei(en) aktualisiert`)
  }
}
