// DD-367 — Milestone-Dependency-Editor (Vorgänger / Nachfolger).
// Extrahiert aus dem deprecated MilestoneDetailPanel (MilestoneRoadmapV2.jsx).
// Props unverändert: { milestone, allMilestones, deps, onChange }.
// Backend: POST /api/milestone-dependencies {predecessor_id, successor_id}
//          (409 + body.path bei Zyklus), DELETE /api/milestone-dependencies/:depId.

import { useState } from 'react'
import { X, Plus } from 'lucide-react'

// PURE: Milestones, die als Dependency-Kandidaten in Frage kommen —
// alle außer dem eigenen Milestone und außer bereits verknüpften (excludeIds).
// Robust gegen leere/null-Eingaben.
export function availableCandidates(allMilestones, milestoneId, excludeIds) {
  if (!Array.isArray(allMilestones)) return []
  const exclude = excludeIds instanceof Set ? excludeIds : new Set(excludeIds ?? [])
  return allMilestones.filter(m => m && m.id !== milestoneId && !exclude.has(m.id))
}

export default function MilestoneDependencyEditor({ milestone, allMilestones, deps, onChange }) {
  const [toast, setToast] = useState(null)
  const predecessorIds = new Set((deps?.predecessors ?? []).map(d => d.id))
  const successorIds = new Set((deps?.successors ?? []).map(d => d.id))
  const preCandidates = availableCandidates(allMilestones, milestone.id, predecessorIds)
  const sucCandidates = availableCandidates(allMilestones, milestone.id, successorIds)
  const [pickPre, setPickPre] = useState('')
  const [pickSuc, setPickSuc] = useState('')

  async function addDep(predecessor_id, successor_id) {
    const res = await fetch('/api/milestone-dependencies', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predecessor_id, successor_id }),
    })
    if (res.status === 409) {
      const body = await res.json()
      setToast({ kind: 'error', msg: `Zyklus: ${body.path?.join(' → ') ?? 'unbekannt'}` })
      setTimeout(() => setToast(null), 4000)
      return
    }
    if (!res.ok) {
      setToast({ kind: 'error', msg: 'Fehler beim Anlegen' })
      setTimeout(() => setToast(null), 3000)
      return
    }
    onChange?.()
  }

  async function removeDep(depId) {
    await fetch(`/api/milestone-dependencies/${depId}`, { method: 'DELETE' })
    onChange?.()
  }

  return (
    <div data-testid={`dependency-editor-${milestone.id}`} data-ui="milestone-detail.dep-editor" style={{ marginTop: 16 }}>
      <h3>Vorgänger / Nachfolger</h3>
      {toast && (
        <div
          data-testid="dependency-toast"
          data-ui="milestone-detail.dep-editor.toast"
          role="alert"
          style={{
            padding: 8, marginBottom: 8, borderRadius: 4,
            background: toast.kind === 'error' ? 'var(--red)' : 'var(--green)',
            color: 'var(--on-accent)',
          }}
        >{toast.msg}</div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <section data-testid="predecessors-section" data-ui="milestone-detail.dep-editor.predecessors">
          <h4>Vorgänger</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {(deps?.predecessors ?? []).map(p => (
              <li
                key={p.dependency_id}
                data-testid={`predecessor-${p.name}`}
                data-ui={`milestone-detail.dep-editor.predecessors.item.${p.dependency_id}`}
                style={{ padding: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}
              >
                <span>{p.name}</span>
                <button
                  onClick={() => removeDep(p.dependency_id)}
                  data-testid={`predecessor-remove-${p.name}`}
                  data-ui="milestone-deps.remove"
                  aria-label={`Remove ${p.name}`}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, background: 'transparent', color: 'var(--red)', border: 'none', cursor: 'pointer' }}
                ><X size={16} /></button>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              value={pickPre}
              onChange={e => setPickPre(e.target.value)}
              data-testid="predecessor-select"
              data-ui="milestone-deps.predecessor.select"
              style={{ flex: 1, padding: 8, minHeight: 44, background: 'var(--surface0)', color: 'var(--text)', border: '1px solid var(--surface1)' }}
            >
              <option value="">— wähle —</option>
              {preCandidates.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => { if (pickPre) { addDep(Number(pickPre), milestone.id); setPickPre('') } }}
              data-testid="predecessor-add-button"
              data-ui="milestone-deps.predecessor.add"
              disabled={!pickPre}
              aria-label="Vorgänger hinzufügen"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', minHeight: 44, minWidth: 44 }}
            ><Plus size={16} /></button>
          </div>
        </section>

        <section data-testid="successors-section" data-ui="milestone-detail.dep-editor.successors">
          <h4>Nachfolger</h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {(deps?.successors ?? []).map(s => (
              <li
                key={s.dependency_id}
                data-testid={`successor-${s.name}`}
                data-ui={`milestone-detail.dep-editor.successors.item.${s.dependency_id}`}
                style={{ padding: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 }}
              >
                <span>{s.name}</span>
                <button
                  onClick={() => removeDep(s.dependency_id)}
                  data-testid={`successor-remove-${s.name}`}
                  data-ui="milestone-deps.remove"
                  aria-label={`Remove ${s.name}`}
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minHeight: 44, minWidth: 44, background: 'transparent', color: 'var(--red)', border: 'none', cursor: 'pointer' }}
                ><X size={16} /></button>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 4 }}>
            <select
              value={pickSuc}
              onChange={e => setPickSuc(e.target.value)}
              data-testid="successor-select"
              data-ui="milestone-deps.successor.select"
              style={{ flex: 1, padding: 8, minHeight: 44, background: 'var(--surface0)', color: 'var(--text)', border: '1px solid var(--surface1)' }}
            >
              <option value="">— wähle —</option>
              {sucCandidates.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => { if (pickSuc) { addDep(milestone.id, Number(pickSuc)); setPickSuc('') } }}
              data-testid="successor-add-button"
              data-ui="milestone-deps.successor.add"
              disabled={!pickSuc}
              aria-label="Nachfolger hinzufügen"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '8px 16px', minHeight: 44, minWidth: 44 }}
            ><Plus size={16} /></button>
          </div>
        </section>
      </div>
    </div>
  )
}
