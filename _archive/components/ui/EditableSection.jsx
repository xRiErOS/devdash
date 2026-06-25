import { Pencil } from 'lucide-react'

// Geteilter Organism (P07, Plan 05 A1). VERBATIM aus ItemDetail.jsx `Section`
// extrahiert — gleiche JSX/Klassen/data-ui. Konsumiert von ItemDetail; danach
// von SprintReview/MilestoneView (View-Vereinheitlichung, Phase 8).
export default function EditableSection({ title, indicator, headerRight, editing, onStartEdit, onSave, onCancel, saving, error, children, renderEdit, dirty: _dirty, onDirtyChange: _onDirtyChange }) {
  return (
    <div className="rounded-xl mb-3" style={{ background: 'var(--mantle)' }}>
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <h3 className="text-[11px] font-mono uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--subtext0)' }}>
          {title}
          {indicator}
        </h3>
        <div className="ml-auto flex items-center gap-1.5">
          {headerRight}
          {!editing && onStartEdit && (
            <button
              type="button"
              onClick={onStartEdit}
              data-ui="issue-detail.section.edit"
              aria-label={`${title} bearbeiten`}
              title="Bearbeiten"
              className="opacity-50 hover:opacity-100 transition-opacity rounded p-1"
              style={{ color: 'var(--subtext0)' }}
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pb-4">
        {editing ? (
          <>
            {renderEdit?.()}
            {error && <p className="text-xs mt-2" style={{ color: 'var(--red)' }}>{error}</p>}
            <div className="flex justify-end gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--surface0)' }}>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                data-ui="issue-detail.section.cancel"
                className="px-3 py-1.5 rounded text-xs"
                style={{ background: 'transparent', color: 'var(--subtext0)' }}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={saving}
                data-ui="issue-detail.section.save"
                className="px-3 py-1.5 rounded text-xs font-medium text-white"
                style={{ background: 'var(--accent-primary)', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Speichern…' : 'Speichern'}
              </button>
            </div>
          </>
        ) : children}
      </div>
    </div>
  )
}
