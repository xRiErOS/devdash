import React, { useEffect, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'

// DD-130: Chip-Liste mit Auto-Complete vom Repo-Filesystem.
// Props:
//   files: array of strings (paths) | array of {id?, path}
//   onChange(nextPaths: string[])
//   readOnly: bool — render Chips nur, kein Add/X
export default function RelevantFilesPicker({ files = [], onChange, readOnly = false }) {
  const paths = files.map(f => (typeof f === 'string' ? f : f.path))
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  // DD-163: Such-Interface bei Klick ausserhalb schliessen. Bereits committete
  // Pfade bleiben erhalten (kommen via `files`-Prop, nicht aus dem Query).
  useEffect(() => {
    if (!adding) return
    const handler = (e) => {
      if (!wrapRef.current) return
      if (!wrapRef.current.contains(e.target)) {
        setAdding(false)
        setQuery('')
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [adding])

  const pathsKey = paths.join(',')

  useEffect(() => {
    if (!adding) return
    let cancelled = false
    const ctrl = new AbortController()
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/projects/2/files?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) {
          setSuggestions((data.files || []).filter(f => !paths.includes(f)).slice(0, 20))
          setActiveIdx(0)
        }
      } catch {}
    }, 120)
    return () => { cancelled = true; ctrl.abort(); clearTimeout(timer) }
    // paths bewusst als Wert-Vergleich (pathsKey) statt Array-Identität — Parent
    // erzeugt das Array pro Render neu; Identitäts-Dep würde Fetch-Churn triggern.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, adding, pathsKey])

  const remove = (p) => {
    if (readOnly) return
    onChange?.(paths.filter(x => x !== p))
  }
  const add = (p) => {
    const t = (p || '').trim()
    if (!t) return
    if (paths.includes(t)) return
    onChange?.([...paths, t])
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  return (
    <div ref={wrapRef}>
      <div className="flex flex-wrap gap-1.5">
        {paths.map(p => (
          <span
            key={p}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
            style={{ background: 'var(--surface1)', color: 'var(--text)' }}
          >
            <span>{p}</span>
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label={`${p} entfernen`}
                className="hover:opacity-70"
                style={{ color: 'var(--hint)' }}
              >
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && !adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setQuery(''); setTimeout(() => inputRef.current?.focus(), 0) }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
            style={{ background: 'var(--surface0)', color: 'var(--subtext0)', border: '1px dashed var(--surface2)' }}
          >
            <Plus size={12} /> Datei
          </button>
        )}
      </div>
      {adding && !readOnly && (
        <div className="mt-2 relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Pfad suchen oder eintippen…"
            className="w-full rounded-lg px-3 py-2 outline-none"
            style={{ background: 'var(--surface0)', color: 'var(--text)', fontSize: '14px', border: '1px solid var(--surface2)' }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                // DD-163: stopPropagation, damit das umgebende Detail-Panel
                // nicht gleichzeitig den Edit-Modus verlaesst und der Speichern-
                // Button erreichbar bleibt.
                e.preventDefault()
                e.stopPropagation()
                setAdding(false)
                setQuery('')
                setSuggestions([])
                return
              }
              if (e.key === 'Enter') {
                e.preventDefault()
                if (suggestions[activeIdx]) add(suggestions[activeIdx])
                else if (query.trim()) add(query)
              }
              if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
            }}
          />
          {suggestions.length > 0 && (
            <div
              className="absolute left-0 right-0 mt-1 rounded-lg shadow-lg overflow-hidden z-30"
              style={{ background: 'var(--base)', border: '1px solid var(--surface2)', maxHeight: '240px', overflowY: 'auto' }}
            >
              {suggestions.map((f, i) => (
                <button
                  key={f}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); add(f) }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className="w-full text-left px-3 py-1.5 text-xs font-mono"
                  style={{
                    background: i === activeIdx ? 'var(--surface1)' : 'transparent',
                    color: 'var(--text)',
                  }}
                >
                  {f}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-2 text-[11px]" style={{ color: 'var(--hint)' }}>
            <span>Enter: hinzufügen · Esc: schließen · ↑↓: navigieren</span>
            <button
              type="button"
              onClick={() => { setAdding(false); setQuery('') }}
              className="ml-auto hover:underline"
              style={{ color: 'var(--subtext0)' }}
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
