#!/usr/bin/env node
// @index
// title: gen-index
// desc: Generiert die INDEX.md-Manifest-Tabelle eines Buckets (scripts/, docs/) mit --check-Drift-Guard
// @end
/**
 * gen-index.mjs — generiert die Manifest-Tabelle `<dir>/INDEX.md` für einen
 * enumerierbaren Bucket (viele Peer-Artefakte gleicher Art, z.B. scripts/, docs/).
 *
 * Kontext-Model U39/U40: Discovery ohne always-on-Kosten. Die INDEX.md ist
 * KEIN auto-load-Artefakt — sie wird über eine Router-Zeile in CLAUDE.md
 * auffindbar gemacht. Ein Agent liest die Tabelle punktuell statt den ganzen
 * Ordner zu grepen.
 *
 * Metadaten-Quelle je Dateityp:
 *   - Code (.mjs/.js/.cjs/.py/.sh)  → @index-Pragma-Block (Format A)
 *         // @index
 *         // title: <kurzname>
 *         // desc: <einzeiler>
 *         // @end
 *     (führendes Kommentar-Präfix // # -- ; wird gestrippt → präfix-agnostisch)
 *   - Markdown (.md)               → YAML-Frontmatter mit title + description
 *                                     (opt-in: nur Dateien MIT beiden Keys)
 *
 * Ausgabe: Tabelle `| Titel | Beschreibung | Pfad |`, alphabetisch stabil.
 *
 *   node scripts/gen-index.mjs <dir> [--check]
 *
 * --check: regeneriert im Speicher, difft gegen die eingecheckte INDEX.md und
 *          exitet non-zero bei (a) Abweichung ODER (b) Code-Datei ohne Pragma
 *          (= Vollständigkeits-Guard). Kein Schreiben.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'fs'
import { join, basename } from 'path'

const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const dirArg = args.find((a) => !a.startsWith('--'))

if (!dirArg) {
  console.error('Usage: node scripts/gen-index.mjs <dir> [--check]')
  process.exit(2)
}

const DIR = dirArg.replace(/\/+$/, '')
if (!existsSync(DIR) || !statSync(DIR).isDirectory()) {
  console.error(`FAIL: "${DIR}" ist kein Verzeichnis.`)
  process.exit(2)
}

// --- Konfiguration -----------------------------------------------------------
const CODE_EXT = new Set(['.mjs', '.js', '.cjs', '.py', '.sh', '.bash', '.zsh'])
// Struktur-/Daten-Dateien nie als Katalog-Eintrag:
const EXCLUDE_NAMES = new Set([
  'INDEX.md', 'CLAUDE.md', 'GLOSSARY.md', 'GLOSSARY-MAP.md', 'README.md', '.DS_Store',
])
const EXCLUDE_EXT = new Set(['.json', '.lock', '.map'])

const OUT = join(DIR, 'INDEX.md')

// --- Extraktoren -------------------------------------------------------------
function ext(name) {
  const i = name.lastIndexOf('.')
  return i < 0 ? '' : name.slice(i)
}

/** Strippt führendes Zeilen-Kommentar-Präfix (// # -- ;) + optionalen * (JSDoc). */
function stripComment(line) {
  return line.replace(/^\s*(\/\/+|#+|--|;+|\*)\s?/, '').trimEnd()
}

/** Code-Pragma-Block: @index .. @end, key: value. Null wenn kein Block. */
function parsePragma(text) {
  const lines = text.split(/\r?\n/)
  let inBlock = false
  const kv = {}
  for (const raw of lines) {
    const line = stripComment(raw)
    if (!inBlock) {
      if (/^@index\b/.test(line)) inBlock = true
      continue
    }
    if (/^@end\b/.test(line)) break
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (m) kv[m[1].toLowerCase()] = m[2].trim()
  }
  if (!inBlock) return null
  const title = kv.title || kv.name
  const desc = kv.desc || kv.description
  if (!title || !desc) return { partial: true, title, desc }
  return { title, desc }
}

/** Markdown-Frontmatter: minimaler YAML-Parser für title/description. */
function parseFrontmatter(text) {
  if (!text.startsWith('---')) return null
  const end = text.indexOf('\n---', 3)
  if (end < 0) return null
  const block = text.slice(3, end)
  const kv = {}
  for (const raw of block.split(/\r?\n/)) {
    const m = raw.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/)
    if (m) kv[m[1].toLowerCase()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  const title = kv.title
  const desc = kv.description
  if (!title || !desc) return null // opt-in: beide Keys nötig
  return { title, desc }
}

// --- Sammeln -----------------------------------------------------------------
const entries = []
const missing = [] // Code-Dateien ohne (vollständigen) Pragma

for (const name of readdirSync(DIR).sort()) {
  if (EXCLUDE_NAMES.has(name)) continue
  const full = join(DIR, name)
  if (!statSync(full).isFile()) continue
  const e = ext(name)
  if (EXCLUDE_EXT.has(e)) continue

  const relPath = `${DIR}/${name}`
  const text = readFileSync(full, 'utf8')

  if (CODE_EXT.has(e)) {
    const p = parsePragma(text)
    if (!p || p.partial) {
      missing.push(relPath)
      continue
    }
    entries.push({ title: p.title, desc: p.desc, path: relPath })
  } else if (e === '.md') {
    const fm = parseFrontmatter(text)
    if (fm) entries.push({ title: fm.title, desc: fm.desc, path: relPath })
    // .md ohne Frontmatter = bewusst nicht gelistet (kein missing-Fail)
  }
  // andere Endungen: ignoriert
}

entries.sort((a, b) => a.path.localeCompare(b.path))

// --- Render ------------------------------------------------------------------
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
function render() {
  const lines = []
  lines.push(`# INDEX — \`${DIR}/\``)
  lines.push('')
  lines.push('> Generiert von `scripts/gen-index.mjs` — nicht von Hand editieren.')
  lines.push('> Regenerieren: `npm run gen:index -- ' + DIR + '`. Metadaten pflegen: `@index`-Block (Code) bzw. YAML-Frontmatter (`.md`).')
  lines.push('')
  lines.push('| Titel | Beschreibung | Pfad |')
  lines.push('|-------|--------------|------|')
  for (const it of entries) {
    lines.push(`| ${cell(it.title)} | ${cell(it.desc)} | \`${cell(it.path)}\` |`)
  }
  lines.push('')
  return lines.join('\n')
}

const output = render()

// --- Check vs Write ----------------------------------------------------------
if (CHECK) {
  let failed = false
  if (missing.length) {
    failed = true
    console.error(`FAIL: ${missing.length} Code-Datei(en) ohne vollständigen @index-Block:`)
    for (const m of missing) console.error(`  - ${m}`)
  }
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : ''
  if (current !== output) {
    failed = true
    console.error(`FAIL: ${OUT} ist veraltet (Drift). Regenerieren: npm run gen:index -- ${DIR}`)
  }
  if (failed) process.exit(1)
  console.log(`OK: ${OUT} aktuell (${entries.length} Einträge).`)
  process.exit(0)
}

writeFileSync(OUT, output)
console.log(`geschrieben: ${OUT} (${entries.length} Einträge${missing.length ? `, ${missing.length} ohne Pragma übersprungen` : ''}).`)
if (missing.length) {
  console.warn('WARN: ohne @index-Block (nicht gelistet):')
  for (const m of missing) console.warn(`  - ${m}`)
}
