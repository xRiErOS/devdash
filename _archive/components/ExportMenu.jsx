import { useEffect, useRef, useState } from 'react'
import { Download, ChevronDown } from 'lucide-react'

// DD-149: Konsolidiertes Export-Dropdown für Backlog & Sprint-Review.
// formats: [{ label: 'Markdown', href: '/api/...?format=md', title?: '…' }, ...]
export default function ExportMenu({ formats, label = 'Export' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
        style={{ background: 'var(--surface1)', color: 'var(--text)', minHeight: '36px' }}
        title={`${label} (Markdown / CSV)`}
      >
        <Download size={13} />
        {label}
        <ChevronDown size={12} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-1 z-30 rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ background: 'var(--surface0)', border: '1px solid var(--surface2)' }}
        >
          {formats.map(f => (
            <a
              key={f.label}
              href={f.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-3 py-1.5 text-xs"
              style={{ color: 'var(--text)' }}
              title={f.title}
            >
              {f.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
