#!/usr/bin/env node
// @index
// title: memory-trigger-match
// desc: UserPromptSubmit-Hook — matcht Prompt gegen memory-triggers.json, Signal-only (MEM-25)
// @end
// MEM-25 T10 — UserPromptSubmit-Trigger-Hook (Signal-only). Grill 2026-06-21 D08.
//
// Scannt den Nutzer-Prompt gegen ein statisches, geteiltes Trigger-Register
// (scripts/memory-triggers.json). Bei Treffer gibt der Hook NUR ein Signal aus
// ("Projektwissen vorhanden zu <Stichwort> — bei Bedarf project_memory abfragen"),
// injiziert KEINEN Inhalt — das LLM entscheidet selbst, ob/was es abfragt.
//
// Self-gating: laeuft global (UserPromptSubmit), aber feuert nur wenn der cwd des
// Prompts in einem Repo mit scripts/memory-triggers.json liegt (= DevDashboard-Checkout
// oder dessen Worktree). In jedem anderen Projekt -> stiller No-op.
//
// Als Modul testbar (loadTriggers/matchTriggers/renderSignal), als CLI via stdin lauffaehig.

import { readFileSync, existsSync } from 'fs'
import { dirname, resolve, join } from 'path'

export function loadTriggers(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  const out = {}
  for (const [k, v] of Object.entries(raw)) {
    if (k.startsWith('_')) continue // Meta-Felder (_comment) ueberspringen
    out[k] = v
  }
  return out
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Wort-Anfangs-Grenze: Keyword muss an einer Token-Grenze beginnen (kein vorangehender
// Buchstabe/Ziffer), darf aber Flexions-Endungen tragen (deploy -> deployen, deployt).
// Verhindert Falsch-Treffer wie "redeployed" (deploy nach 're'), erlaubt deutsche Beugung.
export function matchTriggers(prompt, triggers) {
  if (!prompt) return []
  const text = prompt.toLowerCase()
  const hits = []
  for (const [tag, hint] of Object.entries(triggers)) {
    const re = new RegExp(`(?<![a-z0-9])${escapeRe(tag.toLowerCase())}`)
    if (re.test(text)) hits.push({ tag, hint })
  }
  return hits
}

export function renderSignal(hits) {
  if (!hits || hits.length === 0) return ''
  const tags = hits.map((h) => h.tag).join(', ')
  const lines = [
    '## ⚠ Projektwissen vorhanden (DevDashboard)',
    '',
    `Stichwörter erkannt: **${tags}**. Bei Bedarf das projekt-spezifische Gedächtnis abfragen,`,
    'bevor du zu diesen Themen empfiehlst/handelst (Signal-only — Inhalt NICHT hier injiziert):',
    '',
    '`devd-cli memory query "<stichwort>"`  ·  MCP `devd_project_memory_query`',
    '',
    ...hits.map((h) => `- **${h.tag}** — ${h.hint}`),
  ]
  return lines.join('\n')
}

// --- CLI / Hook-Pfad -------------------------------------------------------

function findTriggersFile(startDir) {
  let dir = startDir
  for (let i = 0; i < 40; i++) {
    const candidate = join(dir, 'scripts', 'memory-triggers.json')
    if (existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return null
}

async function main() {
  let raw = ''
  for await (const chunk of process.stdin) raw += chunk
  let data = {}
  try {
    data = raw.trim() ? JSON.parse(raw) : {}
  } catch {
    return // kein valides Hook-JSON -> still
  }
  const prompt = data.prompt || ''
  const cwd = data.cwd || process.cwd()
  if (!prompt) return

  const triggersFile = findTriggersFile(cwd)
  if (!triggersFile) return // nicht im DevDashboard-Repo -> No-op (self-gating)

  let triggers
  try {
    triggers = loadTriggers(triggersFile)
  } catch {
    return
  }
  const signal = renderSignal(matchTriggers(prompt, triggers))
  if (signal) process.stdout.write(signal + '\n')
}

// Nur als CLI ausfuehren, nicht beim Import (Test).
const isCli = resolve(process.argv[1] || '') === resolve(new URL(import.meta.url).pathname)
if (isCli) main()
