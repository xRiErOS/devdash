import { ArrowLeft } from 'lucide-react'
import IconButton from '../atoms/IconButton.jsx'
import Button from '../atoms/Button.jsx'
import StickyActionBar from '../atoms/StickyActionBar.jsx'

/**
 * DetailEditScreen — dedizierter Vollbild-Editor für lange Felder (DD-635 / F3,
 * DD-599). Trennt das fokussierte Bearbeiten langer Texte (Goal/Background/
 * Acceptance) vom Quick-Meta-Sheet kurzer Felder. Eigener Back-Header
 * (app-shell.detail.back, ≥44px), mehrzeiliges Editorfeld und eine Sticky-Action-
 * Bar (Abbrechen/Speichern, ≥44px) am unteren Rand.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {string} props.label - Feldname (z.B. "Background")
 * @param {string} props.value
 * @param {(next:string)=>void} [props.onChange]
 * @param {()=>void} [props.onSave]
 * @param {()=>void} [props.onCancel]
 * @param {boolean} [props.saving]
 */
export default function DetailEditScreen({ open, label, value = '', onChange, onSave, onCancel, saving = false }) {
  if (!open) return null
  const fieldId = `detail-edit-${String(label || 'field').toLowerCase().replace(/\s+/g, '-')}`
  return (
    <div
      role="dialog"
      aria-label={`${label} bearbeiten`}
      className="absolute inset-0 z-40 flex flex-col bg-[var(--base)]"
    >
      <div className="flex items-center gap-2 shrink-0 px-3 py-2 bg-[var(--mantle)] border-b border-[var(--surface0)]">
        <IconButton
          icon={<ArrowLeft size={22} />}
          label="Zurück"
          variant="ghost"
          size="lg"
          onClick={onCancel}
          data-ui="app-shell.detail.back"
        />
        <span className="font-bold truncate text-[var(--text)]">{label} bearbeiten</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <label className="text-xs font-medium text-[var(--subtext0)]" htmlFor={fieldId}>{label}</label>
        <textarea
          id={fieldId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          data-ui="app-shell.detail.edit-screen.field"
          className="mt-2 w-full min-h-[12rem] rounded-md border border-[var(--surface1)] bg-[var(--mantle)] p-3 text-sm text-[var(--text)] outline-none resize-y"
        />
      </div>

      {/* DD-637 (F5): kanonisches StickyActionBar-Atom → pb-safe-bar respektiert
          den iOS-Home-Indicator-Inset (kein Bottom-Collision, DD-598). */}
      <StickyActionBar className="shrink-0 mt-0">
        <Button variant="ghost" size="lg" onClick={onCancel} disabled={saving}>Abbrechen</Button>
        <Button variant="primary" size="lg" onClick={onSave} loading={saving}>Speichern</Button>
      </StickyActionBar>
    </div>
  )
}
