import { useState } from 'react'
import { X, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export default function SubTaskRow({ task, isLast, onToggle, onRename, onQaEdit, onDelete }) {
  // DD-45 R04: Drag&Drop via @dnd-kit. Up/Down-Buttons ersetzt durch Drag-Handle.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const done = task.status === 'done'
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderBottom: isLast ? 'none' : '1px solid var(--surface0)',
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 py-2 text-sm"
    >
      <button
        type="button"
        onClick={onToggle}
        data-ui={`issue-detail.subtasks.item.${task.id}.toggle`}
        aria-label={done ? 'Als offen markieren' : 'Als erledigt markieren'}
        className="flex items-center justify-center rounded shrink-0"
        style={{
          width: '18px',
          height: '18px',
          border: `2px solid ${done ? 'var(--accent-success)' : 'var(--overlay0)'}`,
          background: done ? 'var(--accent-success)' : 'transparent',
        }}
      >
        {done && <span style={{ color: 'var(--on-accent)', fontSize: '11px', lineHeight: 1 }}>✓</span>}
      </button>
      {editing ? (
        <input
          autoFocus
          type="text"
          value={draft}
          data-ui={`issue-detail.subtasks.item.${task.id}.title-input`}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            const t = draft.trim()
            if (t && t !== task.title) onRename(t)
            setEditing(false)
            setDraft(t || task.title)
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.target.blur() }
            else if (e.key === 'Escape') { setDraft(task.title); setEditing(false) }
          }}
          className="flex-1 min-w-0 px-2 py-1 rounded outline-none"
          style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px' }}
        />
      ) : (
        <span
          className="flex-1 min-w-0 truncate cursor-text"
          data-ui={`issue-detail.subtasks.item.${task.id}.title`}
          onClick={() => setEditing(true)}
          style={{
            color: done ? 'var(--hint)' : 'var(--text)',
            textDecoration: done ? 'line-through' : 'none',
          }}
        >
          {task.title}
        </span>
      )}
      <button
        type="button"
        onClick={onQaEdit}
        data-ui={`issue-detail.subtasks.item.${task.id}.qa-edit`}
        className="shrink-0 text-[10px] px-1.5 py-0.5 rounded"
        style={{
          background: task.qa_criteria ? 'rgba(166,218,149,0.12)' : 'var(--surface0)',
          color: task.qa_criteria ? 'var(--green)' : 'var(--hint)',
          border: `1px solid ${task.qa_criteria ? 'rgba(166,218,149,0.35)' : 'var(--surface1)'}`,
        }}
        title={task.qa_criteria || 'QA-Kriterium bearbeiten'}
      >
        QA
      </button>
      <button
        type="button"
        {...attributes}
        {...listeners}
        data-ui={`issue-detail.subtasks.item.${task.id}.drag-handle`}
        aria-label="Sub-Task ziehen"
        title="Reihenfolge per Drag&Drop"
        className="shrink-0 flex items-center justify-center rounded cursor-grab active:cursor-grabbing opacity-50 group-hover:opacity-100 focus:opacity-100"
        style={{ width: '24px', height: '24px', color: 'var(--hint)' }}
      >
        <GripVertical size={14} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        data-ui={`issue-detail.subtasks.item.${task.id}.delete`}
        aria-label="Sub-Task entfernen"
        title="Entfernen"
        className="shrink-0 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 focus:opacity-100"
        style={{ width: '24px', height: '24px', color: 'var(--hint)' }}
      >
        <X size={12} />
      </button>
    </li>
  )
}

// DD-123: Inline-Edit Title — Klick auf H2 → Input. Enter speichert, Esc verwirft, Blur speichert.
