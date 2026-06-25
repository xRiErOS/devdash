// DD-366 — Editierbarer Definition-of-Done-Editor.
//
// Portiert aus MilestoneRoadmapV2.jsx (ehemals DodItemList + SortableDodItem im
// deprecated MilestoneDetailPanel). Verhalten/Endpoints 1:1 übernommen:
//   - add    → POST   /api/milestones/:id/dod-items   { label }
//   - toggle → PATCH  /api/dod-items/:id              { done }
//   - delete → DELETE /api/dod-items/:id
//   - reorder→ PATCH  /api/milestones/:id/dod-items/reorder { order }
//
// Modernisierung beim Port: Catppuccin-Tokens statt Roh-Hex, Lucide-X statt ✕,
// data-ui-Slugs (milestone.dod.*). Touch-Targets ≥44px, Input fontSize 16px.

import { useEffect, useState } from 'react'
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { X } from 'lucide-react'

function SortableDodItem({ item, onToggle, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <li
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex', alignItems: 'center', gap: 8, padding: 6,
        background: 'var(--surface0)', borderRadius: 4, marginBottom: 4, minHeight: 44,
      }}
      data-testid={`dod-item-${item.id}`}
      data-ui="milestone.dod.item"
    >
      <span {...attributes} {...listeners} style={{ cursor: 'grab' }} aria-label="Drag" data-ui={`milestone-detail.dod-editor.item.${item.id}.drag-handle`}>⋮⋮</span>
      <input
        type="checkbox"
        checked={item.done === 1}
        onChange={() => onToggle(item)}
        data-testid={`dod-checkbox-${item.id}`}
        data-ui={`milestone-detail.dod-editor.item.${item.id}.toggle`}
        style={{ width: 20, height: 20 }}
      />
      <span data-testid={`dod-label-${item.id}`} style={{ flex: 1 }}>{item.label}</span>
      <button
        onClick={() => onDelete(item)}
        data-testid={`dod-delete-${item.id}`}
        data-ui="milestone.dod.remove"
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '4px 8px', minHeight: 44, minWidth: 44, background: 'transparent', color: 'var(--red)', border: 'none', cursor: 'pointer' }}
        aria-label="Delete DoD item"
      ><X size={16} /></button>
    </li>
  )
}

export default function MilestoneDodEditor({ milestoneId, items, onChange }) {
  const [list, setList] = useState(items ?? [])
  const [draft, setDraft] = useState('')

  useEffect(() => { setList(items ?? []) }, [items])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  async function toggle(item) {
    const newDone = item.done === 1 ? 0 : 1
    setList(prev => prev.map(it => it.id === item.id ? { ...it, done: newDone } : it))
    await fetch(`/api/dod-items/${item.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done: newDone }),
    })
    onChange?.()
  }

  async function addItem() {
    if (!draft.trim()) return
    const res = await fetch(`/api/milestones/${milestoneId}/dod-items`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: draft.trim() }),
    })
    if (res.ok) {
      setDraft('')
      onChange?.()
    }
  }

  async function deleteItem(item) {
    if (!confirm(`Delete "${item.label}"?`)) return
    await fetch(`/api/dod-items/${item.id}`, { method: 'DELETE' })
    onChange?.()
  }

  async function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return
    const oldIdx = list.findIndex(i => i.id === active.id)
    const newIdx = list.findIndex(i => i.id === over.id)
    const next = arrayMove(list, oldIdx, newIdx)
    setList(next)
    await fetch(`/api/milestones/${milestoneId}/dod-items/reorder`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: next.map(i => i.id) }),
    })
    onChange?.()
  }

  return (
    <div data-testid={`dod-list-${milestoneId}`} data-ui="milestone-detail.dod-editor">
      <h3 data-ui="milestone-detail.dod-editor.heading">Definition of Done</h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={list.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {list.map(item => (
              <SortableDodItem key={item.id} item={item} onToggle={toggle} onDelete={deleteItem} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }} data-ui="milestone-detail.dod-editor.add-form">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Neues DoD-Item…"
          data-testid="dod-add-input"
          data-ui="milestone.dod.add"
          style={{ flex: 1, padding: 8, minHeight: 44, fontSize: 16, background: 'var(--surface0)', border: '1px solid var(--surface1)', color: 'var(--text)' }}
          onKeyDown={e => e.key === 'Enter' && addItem()}
        />
        <button
          onClick={addItem}
          data-testid="dod-add-button"
          data-ui="milestone.dod.add"
          style={{ padding: '8px 16px', minHeight: 44, minWidth: 44, background: 'var(--green)', color: '#1e1e2e', border: 'none', cursor: 'pointer' }} // hex-ok: dark-text-on-bright-status-fill
        >+</button>
      </div>
    </div>
  )
}
