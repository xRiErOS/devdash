import { useEffect, useState } from 'react'

/**
 * Schlanker Tab-Container fuer kompakte Detailflaechen.
 * - tabs: [{ id, label, count? }]
 * - storageKey (optional): persistiert active-Tab in localStorage
 */
export default function Tabs({ tabs, value, onChange, storageKey, children }) {
  const [internal, setInternal] = useState(() => {
    if (value !== undefined) return value
    if (storageKey) {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored && tabs.some(t => t.id === stored)) return stored
      } catch {}
    }
    return tabs[0]?.id
  })

  const active = value ?? internal

  useEffect(() => {
    if (storageKey && active) {
      try { localStorage.setItem(storageKey, active) } catch {}
    }
  }, [storageKey, active])

  const handleChange = (id) => {
    if (onChange) onChange(id)
    else setInternal(id)
  }

  return (
    <>
      <nav
        role="tablist"
        className="flex gap-0 sticky top-0 z-10 px-2 overflow-x-auto"
        style={{ background: 'var(--mantle)', borderBottom: '1px solid var(--surface0)' }}
      >
        {tabs.map(t => {
          const isActive = t.id === active
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleChange(t.id)}
              className="px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap"
              style={{
                color: isActive ? 'var(--text)' : 'var(--hint)',
                borderBottom: isActive ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {t.label}
              {typeof t.count === 'number' && (
                <span
                  className="ml-1.5 text-[10px] font-mono px-1 rounded"
                  style={{ background: 'var(--surface0)', color: 'var(--subtext0)' }}
                >
                  {t.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="flex-1 overflow-y-auto">
        {typeof children === 'function' ? children(active) : children}
      </div>
    </>
  )
}
