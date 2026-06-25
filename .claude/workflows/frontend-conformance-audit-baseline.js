export const meta = {
  name: 'frontend-conformance-audit-baseline',
  description: 'Baseline-Lauf (pre-Phase-8, SHA 4cfc52e) des Frontend-Konformitäts-Audits — repo fest verdrahtet auf Worktree',
  phases: [{ title: 'Audit', detail: '5 Sub-Agents parallel gegen Baseline-Worktree' }],
}

// FEST verdrahtet (Arg-Passing war unzuverlässig) — Baseline-Worktree am Pre-Phase-8-SHA
const repo = '/Users/erik/Obsidian/tools/DeveloperDashboard/.claude/worktrees/baseline-pre-p8'
const runId = '2026-06-03-pre-phase8'
const ref = '4cfc52e'
const auditNote = '/Users/erik/Obsidian/Vault/750 PERSISTENTS/750.10 AI-Driven Frontend Design — Übersicht/Konformitäts-Audit — Prompt für Tool-Bewertung gegen Frontend-Konzepte.md'

const DIM_SCHEMA = {
  type: 'object',
  required: ['id', 'name', 'criteria', 'dimension_mean', 'histogram', 'not_assessable'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    criteria: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'score', 'confidence', 'evidence'],
        properties: {
          id: { type: 'string' },
          score: { type: ['integer', 'null'], minimum: 0, maximum: 4 },
          confidence: { type: 'string', enum: ['belegt', 'inferiert', 'nicht_prüfbar'] },
          evidence: { type: 'string' },
          note: { type: 'string' },
          probe_count: { type: ['integer', 'null'] },
          recommendation: { type: 'string' },
        },
      },
    },
    dimension_mean: { type: ['number', 'null'] },
    histogram: { type: 'object' },
    not_assessable: { type: 'array', items: { type: 'string' } },
  },
}

const DIMS = [
  { id: 'D1', name: 'Token & Enforcement-Harness' },
  { id: 'D2', name: 'Atomic-Komposition' },
  { id: 'D3', name: 'Layout-Achse' },
  { id: 'D4', name: 'Komposition & Propagation' },
  { id: 'D5', name: 'Anforderungs-Traceability & Funktion' },
]

phase('Audit')
const dimResults = await parallel(DIMS.map(d => () => agent(
  `Du bist Analyse-Sub-Agent für Dimension ${d.id} — ${d.name} eines Frontend-Konformitäts-Audits (BASELINE-Lauf, Pre-Phase-8-Stand SHA ${ref}).

WICHTIG — Scope: Das zu auditierende Repo ist ein Git-Worktree unter:
  ${repo}
Führe ALLE Proben mit diesem Arbeitsverzeichnis aus, z.B. \`cd ${repo} && grep ...\`. Scope STRIKT auf ${repo}/src (und ${repo}/tests wo relevant). Auditiere NIEMALS das Haupt-Repo /Users/erik/Obsidian/tools/DeveloperDashboard/src — nur den Worktree. Setze --exclude-dir=.claude bei jeder rekursiven grep.

Audit-Spezifikation (Kriterien, Anker, exakte Proben): lies die Note
  ${auditNote}
und nutze Abschnitt 4 (Anker für ${d.id}) + Abschnitt 10.2 (Count→Score-Schwellen) + 10.1 (DevDash-TARGET-Config; Pfade relativ auf den Worktree oben anwenden).

Vorgehen:
- Pro Kriterium die §10.2-Probe via Bash im Worktree ausführen. probe_count = Roh-Trefferzahl.
- GLOB-EXISTENZ-GEGENPROBE (DD-480) vor JEDEM Score-0-Befund mit Pfad-Glob: zähle zuerst die real gematchten Dateien (\`ls <glob> 2>/dev/null | wc -l\`). 0 Treffer → Probe UNGÜLTIG, KEIN Score 0, Kriterium inferiert/nicht_prüfbar markieren, Glob korrigieren. (Auslöser post-phase8: src/views/*.css matchte 0 Dateien, erzeugte 212 fiktive Violations.)
- Keine Live-App (Baseline ist statischer SHA) → D5 Live-Kriterium K5.1 = nicht_prüfbar/null.
- Score 0-4 STRIKT nach Count→Score-Bucket. confidence=belegt nur bei Treffer-Count-Beleg. Prozessual/subjektiv → nicht_prüfbar/null (nicht in dimension_mean).
- recommendation = kurzer Hinweis bei score<=2.

Liefere GENAU ein dimensions[]-Item nach Schema, plus not_assessable[] (K-ids mit null).`,
  { label: `baseline:${d.id}`, phase: 'Audit', schema: DIM_SCHEMA, agentType: 'Explore' }
)))

const dimensions = dimResults.filter(Boolean)
const notAssessable = dimensions.flatMap(d => d.not_assessable || [])
const scores = {
  tool: 'DevDashboard', run_id: runId, ref, live_app: false,
  baseline_run_id: null, dimensions, not_assessable: notAssessable, findings: [],
}
log(`Baseline ${runId} (${ref}): ${dimensions.length} Dimensionen`)
return { scores }
