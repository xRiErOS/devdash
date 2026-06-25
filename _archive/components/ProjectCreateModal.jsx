import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { setActiveProjectId } from '../lib/projectStore.js'
import Modal from './ui/molecules/Modal.jsx'

// Canonical project-color palette. The hex values are DATA (persisted to
// projects.color in the DB and compared by value), not CSS styling - they must
// stay literal and are intentionally exempt from the no-raw-hex guard.
const COLORS = [
  { name: 'mauve', hex: '#cba6f7' }, // hex-ok: project-color-palette
  { name: 'blue', hex: '#89b4fa' }, // hex-ok: project-color-palette
  { name: 'green', hex: '#a6e3a1' }, // hex-ok: project-color-palette
  { name: 'peach', hex: '#fab387' }, // hex-ok: project-color-palette
  { name: 'pink', hex: '#f5c2e7' }, // hex-ok: project-color-palette
  { name: 'teal', hex: '#94e2d5' }, // hex-ok: project-color-palette
]

function slugifyName(name) {
  return String(name || '').toLowerCase()
    .replace(/[äÄ]/g, 'ae').replace(/[öÖ]/g, 'oe').replace(/[üÜ]/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
}

function defaultPrefix(name) {
  const cleaned = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return cleaned.slice(0, 4) || ''
}

// DD-451: auf zentrales ui/Modal migriert (align="top"). Backdrop/Panel/ESC/
// Backdrop-Close + role=dialog zentral. Die Swatch-Datenfarben (hex) sind
// dynamische DB-Werte → via ref-Callback-CSS-Custom-Property statt inline-style.
function Swatch({ c, selected, onSelect }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.style.setProperty('--swatch-color', c.hex)
      ref.current.style.setProperty('--swatch-ring', selected ? 'var(--text)' : 'transparent')
    }
  }, [c.hex, selected])
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onSelect(c.hex)}
      title={c.name}
      className="w-8 h-8 rounded-full bg-[var(--swatch-color)] border-2 border-[var(--swatch-ring)]"
      aria-label={c.name}
      data-ui={`project-create-modal.color.swatch.${c.name}`}
    />
  )
}

export default function ProjectCreateModal({ open, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [prefix, setPrefix] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0].hex)
  const [repoPath, setRepoPath] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [existing, setExisting] = useState({ slugs: new Set(), prefixes: new Set() })
  const nameRef = useRef(null)
  const slugTouched = useRef(false)
  const prefixTouched = useRef(false)

  useEffect(() => {
    if (!open) return
    setName(''); setSlug(''); setPrefix(''); setDescription(''); setColor(COLORS[0].hex)
    setRepoPath(''); setError(null); setSubmitting(false)
    slugTouched.current = false
    prefixTouched.current = false
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : [])
      .then(list => setExisting({
        slugs: new Set((list || []).map(p => p.slug)),
        prefixes: new Set((list || []).map(p => (p.prefix || '').toUpperCase())),
      }))
      .catch(() => setExisting({ slugs: new Set(), prefixes: new Set() }))
    setTimeout(() => nameRef.current?.focus(), 30)
  }, [open])

  useEffect(() => {
    if (!slugTouched.current) setSlug(slugifyName(name))
    if (!prefixTouched.current) setPrefix(defaultPrefix(name))
  }, [name])

  const slugValid = /^[a-z0-9-]+$/.test(slug) && slug.length > 0
  const prefixValid = /^[A-Z0-9]{2,6}$/.test(prefix)
  const slugDup = existing.slugs.has(slug)
  const prefixDup = existing.prefixes.has(prefix)
  const canSubmit = name.trim() && slugValid && prefixValid && !slugDup && !prefixDup && !submitting

  const submit = async (e) => {
    e?.preventDefault?.()
    if (!canSubmit) return
    setSubmitting(true); setError(null)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug, name: name.trim(), prefix, description: description.trim() || null,
          color, repo_path: repoPath.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setActiveProjectId(data.id)
      onCreated?.(data)
      onClose()
    } catch (err) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  const titleNode = (
    <span className="flex items-center justify-between w-full">
      <span className="text-base font-bold font-display">Neues Projekt</span>
      <button type="button" onClick={onClose} aria-label="Schliessen"
        className="rounded-lg flex items-center justify-center w-8 h-8 text-[var(--subtext0)] hover:bg-[var(--surface0)]"
        data-ui="project-create-modal.header.close">
        <X size={16} />
      </button>
    </span>
  )

  const footer = (
    <>
      <button type="button" onClick={onClose}
        className="px-3 py-1.5 rounded-lg text-sm bg-[var(--surface0)] text-[var(--subtext1)]"
        data-ui="project-create-modal.actions.cancel">
        Abbrechen
      </button>
      <button type="submit" form="project-create-form" disabled={!canSubmit}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 bg-[var(--accent-primary)] text-[var(--on-accent)]"
        data-ui="project-create-modal.actions.save">
        {submitting ? 'Speichere…' : 'Anlegen'}
      </button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={titleNode}
      size="sm"
      align="top"
      fade
      padded={false}
      footer={footer}
      backdropDataUi="project-create-modal"
    >
      <form
        id="project-create-form"
        onSubmit={submit}
        className="p-4 space-y-3"
        data-ui="project-create-modal.form"
      >
        <Field label="Name *">
          <input ref={nameRef} type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none border-0 text-base bg-[var(--surface0)] text-[var(--text)]"
            data-ui="project-create-modal.stammdaten.name" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Slug *" hint="a-z 0-9 -" error={slug && !slugValid ? 'Ungültig' : slugDup ? 'Vergeben' : null}>
            <input type="text" value={slug}
              onChange={(e) => { slugTouched.current = true; setSlug(e.target.value.toLowerCase()) }}
              className="w-full px-3 py-2 rounded-lg outline-none border-0 font-mono text-base bg-[var(--surface0)] text-[var(--text)]"
              data-ui="project-create-modal.stammdaten.slug" />
          </Field>
          <Field label="Prefix *" hint="2-6 GROSS/0-9" error={prefix && !prefixValid ? 'Ungültig' : prefixDup ? 'Vergeben' : null}>
            <input type="text" value={prefix}
              onChange={(e) => { prefixTouched.current = true; setPrefix(e.target.value.toUpperCase()) }}
              maxLength={6}
              className="w-full px-3 py-2 rounded-lg outline-none border-0 font-mono text-base bg-[var(--surface0)] text-[var(--text)]"
              data-ui="project-create-modal.stammdaten.prefix" />
          </Field>
        </div>
        <Field label="Color">
          <div className="flex gap-2" data-ui="project-create-modal.color">
            {COLORS.map(c => (
              <Swatch key={c.hex} c={c} selected={color === c.hex} onSelect={setColor} />
            ))}
          </div>
        </Field>
        <Field label="Description">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 rounded-lg outline-none border-0 resize-none text-base bg-[var(--surface0)] text-[var(--text)]"
            data-ui="project-create-modal.stammdaten.description" />
        </Field>
        <Field label="Repo-Path" hint="z.B. /Users/.../projektname">
          <input type="text" value={repoPath} onChange={(e) => setRepoPath(e.target.value)}
            className="w-full px-3 py-2 rounded-lg outline-none border-0 font-mono text-base bg-[var(--surface0)] text-[var(--text)]"
            data-ui="project-create-modal.stammdaten.repo-path" />
        </Field>
        {error && (
          <div className="text-sm rounded-lg px-3 py-2 bg-[var(--surface0)] text-[var(--red)]"
            data-ui="project-create-modal.stammdaten.error">
            {error}
          </div>
        )}
      </form>
    </Modal>
  )
}

function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs font-mono uppercase tracking-wide text-[var(--hint)]">{label}</span>
        {error ? (
          <span className="text-[11px] font-mono text-[var(--red)]">{error}</span>
        ) : hint ? (
          <span className="text-[11px] font-mono text-[var(--hint)]">{hint}</span>
        ) : null}
      </div>
      {children}
    </label>
  )
}
