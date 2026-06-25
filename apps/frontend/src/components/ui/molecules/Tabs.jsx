import { useEffect, useRef, useState } from 'react'
import TabButton from './TabButton.jsx'

/**
 * Tabs — kanonische, token-saubere Variante (DD-481 Harvest aus components/Tabs.jsx).
 * Generische Tab-Leiste: rendert eine Liste von Tabs und delegiert jeden Eintrag
 * an das Atom <TabButton>. Props-driven, kein Fetch, keine Domänen-Begriffe.
 *
 * Controlled (value gesetzt) oder uncontrolled (interner State, optional via
 * storageKey in localStorage persistiert). Children dürfen eine Render-Funktion
 * sein, die den aktiven Tab-Key erhält.
 *
 * @param {object} props
 * @param {Array<{ id: string, label: import('react').ReactNode, count?: number, icon?: import('react').ReactNode }>} props.tabs - Tab-Definitionen
 * @param {string} [props.value] - kontrollierter aktiver Tab-Key (sonst interner State)
 * @param {(id: string) => void} [props.onChange] - Callback bei Tab-Wechsel
 * @param {string} [props.storageKey] - persistiert den aktiven Tab in localStorage (nur uncontrolled)
 * @param {import('react').ReactNode | ((active: string) => import('react').ReactNode)} [props.children] - Inhalt (oder Render-Fn mit aktivem Key)
 * @param {string} [props.className] - zusätzliche Klassen für die nav-Leiste
 */
export default function Tabs({ tabs, value, onChange, storageKey, children, className = '' }) {
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

  const tablistRef = useRef(null)

  const handleChange = (id) => {
    if (onChange) onChange(id)
    else setInternal(id)
  }

  function handleTablistKeyDown(e) {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    e.preventDefault()
    const btns = [...(tablistRef.current?.querySelectorAll('[role="tab"]') ?? [])]
    if (btns.length === 0) return
    const curr = btns.findIndex((b) => b.getAttribute('aria-selected') === 'true')
    const i = curr < 0 ? 0 : curr
    let next = i
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % btns.length
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + btns.length) % btns.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = btns.length - 1
    btns[next].click()
    btns[next].focus()
  }

  return (
    <>
      <nav
        ref={tablistRef}
        role="tablist"
        data-ui="tabs"
        aria-orientation="horizontal"
        onKeyDown={handleTablistKeyDown}
        className={`flex gap-0 sticky top-0 z-10 px-2 overflow-x-auto bg-[var(--surface0)] border-b border-b-[var(--surface1)] ${className}`}
      >
        {tabs.map(t => (
          <TabButton
            key={t.id}
            id={`tab-${t.id}`}
            aria-controls={`panel-${t.id}`}
            active={t.id === active}
            count={t.count}
            icon={t.icon}
            onClick={() => handleChange(t.id)}
            className="whitespace-nowrap"
          >
            {t.label}
          </TabButton>
        ))}
      </nav>
      {/* tabpanel: KEIN tabIndex — der Panel-Inhalt trägt fokussierbare Elemente
          (WAI-ARIA: tabIndex=0 nur für Panels OHNE fokussierbare Kinder; sonst
          redundanter Tab-Stop, PO-R3). */}
      <div
        data-ui="tabs.panel"
        role="tabpanel"
        id={`panel-${active}`}
        aria-labelledby={`tab-${active}`}
        className="flex-1 overflow-y-auto"
      >
        {typeof children === 'function' ? children(active) : children}
      </div>
    </>
  )
}
