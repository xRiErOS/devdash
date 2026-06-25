export const meta = {
  name: 'frontend-conformance-audit',
  description: 'Metrisches Frontend-Konformitäts-Audit (5 Dimensionen) gegen 750.10-Konzepte, DevDash-Default',
  whenToUse: 'Vorher/Nachher-Validierung eines Frontend-Reworks (z.B. DevDash). Liefert scores.json + findings (issue-ready) + HTML-Report.',
  phases: [
    { title: 'Audit', detail: '5 Sub-Agents parallel, je 1 Dimension, schema-validiert' },
    { title: 'Synthese', detail: 'Merge + findings + HTML + Delta' },
  ],
}

// args = { tool, repo, live_url|null, run_id, ref, baseline|null, audit_note }
const T = args || {}
const repo = T.repo || '~/Obsidian/tools/DeveloperDashboard'
const liveUrl = T.live_url || null
const runId = T.run_id || 'unnamed-run'
const auditNote = T.audit_note
  || '/Users/erik/Obsidian/Vault/750 PERSISTENTS/750.10 AI-Driven Frontend Design — Übersicht/Konformitäts-Audit — Prompt für Tool-Bewertung gegen Frontend-Konzepte.md'

// dimension-JSON-Schema (ein dimensions[]-Item) — erzwingt valide Struktur
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

// DD-480: Pflicht-Probenhygiene gegen Mess-Artefakte. Auslöser: der post-phase8-Run
// vergab K3.2=269/K3.3=152 Phantom-Layout-Violations aus stale .claude/worktrees-Kopien
// + dist/-Bundles + einem Glob (src/views/*.css), der 0 reale Dateien matcht. Echter
// src/ war auf der Layout-Achse längst sauber. Detail: project_memories id 187.
const EXCLUDE = '--exclude-dir=.claude --exclude-dir=dist --exclude-dir=node_modules --exclude-dir=storybook-static --exclude-dir=coverage --exclude-dir=.git'

phase('Audit')
const dimResults = await parallel(DIMS.map(d => () => agent(
  `Du bist Analyse-Sub-Agent für Dimension ${d.id} — ${d.name} eines Frontend-Konformitäts-Audits.
Repo: ${repo}   Live-URL: ${liveUrl || 'keine'}
Audit-Spezifikation (Kriterien, Anker, EXAKTE Proben): lies die Note
  ${auditNote}
und nutze Abschnitt 4 (Anker für ${d.id}) + Abschnitt 10.2 (Count→Score-Schwellen) + 10.1 (DevDash-TARGET-Config).

Vorgehen:
- Führe pro Kriterium deiner Dimension die §10.2-Probe via Bash aus (grep/AST; jscpd nur wenn npx verfügbar, sonst Kriterium inferiert).
- PFLICHT-Probenhygiene (DD-480): JEDE rekursive grep/find MUSS stale Kopien + Build-Artefakte ausschliessen — verwende immer ${EXCLUDE}. Stale .claude/worktrees-Kopien + dist/-Bundles haben K1.7 (Worktree) und K3.2/K3.3 (2026-06-03: 269/152 Phantom-Violations gegen den real sauberen src/) verfälscht. Scope strikt auf ${repo}/src (+ ${repo}/tests wo relevant).
- GLOB-EXISTENZ-GEGENPROBE (DD-480) vor JEDEM Score-0-Befund, der auf einem Pfad-Glob beruht: zähle zuerst die real gematchten Dateien (z.B. \`ls <glob> 2>/dev/null | wc -l\`). Matcht der Glob 0 Dateien, ist die Count-Probe UNGÜLTIG → vergib KEINEN Score 0, markiere das Kriterium als inferiert/nicht_prüfbar und korrigiere den Glob. (Auslöser: \`src/views/*.css\` matchte 0 Dateien, erzeugte aber 212 fiktive CSS-Violations.)
- D5: zusätzlich Playwright gegen Live-URL falls vorhanden; ohne Live-URL Live-Kriterien (K5.1) als nicht_prüfbar/null.
- Vergib Score 0-4 STRIKT nach Count→Score-Bucket (§10.2). probe_count = Roh-Trefferzahl.
- confidence=belegt nur bei Treffer-Count/DOM-Beleg. Prozessual/subjektiv → confidence=nicht_prüfbar, score=null (NICHT in dimension_mean).
- recommendation = konkreter Fix bei score<=2.

Liefere GENAU ein dimensions[]-Item nach Schema, plus not_assessable[] (Liste der K-ids mit null).`,
  { label: `audit:${d.id}`, phase: 'Audit', schema: DIM_SCHEMA, agentType: 'Explore' }
)))

phase('Synthese')
const dimensions = dimResults.filter(Boolean)
const notAssessable = dimensions.flatMap(d => d.not_assessable || [])

// findings-Ableitung (§10.4): score<=2 && belegt
let bN = 0, iN = 0, tN = 0
const findings = []
for (const d of dimensions) {
  for (const c of d.criteria) {
    if (c.score === null || c.score > 2 || c.confidence !== 'belegt') continue
    const isFn = d.id === 'D5'
    const type = isFn && c.score <= 1 ? 'bug' : 'improvement'
    const severity = c.score <= 1 ? 'high' : 'medium'
    const code = type === 'bug' ? `B${String(++bN).padStart(2, '0')}`
      : type === 'improvement' ? `I${String(++iN).padStart(2, '0')}`
      : `T${String(++tN).padStart(2, '0')}`
    findings.push({
      code, dimension_id: d.id, criterion_id: c.id,
      title: `${c.id}: ${c.note || d.name} unter Schwelle (Score ${c.score})`,
      type, severity, score: c.score, evidence: c.evidence,
      recommendation: c.recommendation || 'siehe Anker', relevant_files: [],
    })
  }
}

const scores = {
  tool: T.tool || 'DevDashboard', run_id: runId, ref: T.ref || 'HEAD',
  live_app: !!liveUrl, baseline_run_id: T.baseline ? T.baseline.run_id : null,
  dimensions, not_assessable: notAssessable, findings,
}

const bulkPayload = {
  project: 'devd',
  issues: findings.map(f => ({
    title: f.title, type: f.type,
    priority: f.severity === 'high' ? 'high' : f.severity === 'medium' ? 'medium' : 'low',
    goal: f.recommendation,
    background: `Konformitäts-Audit ${runId} · ${f.criterion_id} · Score ${f.score}/4 · ${f.evidence}`,
    relevant_files: (f.relevant_files || []).join(', '),
  })),
}

// HTML-Render delegiert an Agent (Template §10.5 mit scores füllen)
const html = await agent(
  `Rendere den HTML-Audit-Report nach Template Abschnitt 10.5 der Audit-Note (${auditNote}).
Ersetze {{SCORES_JSON}} durch dieses JSON (unverändert) und {{tool}}/{{run_id}} entsprechend.
Gib NUR das vollständige HTML-Dokument zurück, keine Erklärung:
${JSON.stringify(scores)}`,
  { label: 'render:html', phase: 'Synthese' }
)

log(`Audit ${runId}: ${dimensions.length} Dimensionen, ${findings.length} findings`)
return { scores, bulkPayload, html }
