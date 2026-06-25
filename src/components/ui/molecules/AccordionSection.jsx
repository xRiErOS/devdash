/**
 * AccordionSection — Molecule (04.40 Data Display). Terminal-Disclosure für die
 * EntityDetail-V2-Shell: Trigger (Marker ▸/▾ + [NN]-Index + Titel + optionaler Hint)
 * + animierter Panel-Slot (grid-rows 0fr↔1fr → Panel bleibt im DOM und animiert
 * sauber, anders als AccordionRow das nur bei open rendert).
 *
 * Dumb/controlled (CONV-molecule-boundary): `open` ist Prop, `onToggle` der Callback —
 * der Organismus (EntityDetailBase) besitzt den State. Hausschrift --font-display
 * (JetBrains Mono) für den IDE-Look. Inhalt (z.B. 2:1-Layout) kommt als children.
 *
 * @param {object} props
 * @param {boolean} [props.open=false] - aufgeklappt → Panel sichtbar, Marker ▾.
 * @param {() => void} [props.onToggle] - Klick-Callback des Triggers.
 * @param {string} props.no - zweistelliger Abschnitts-Index, z.B. '01'.
 * @param {import('react').ReactNode} props.title - Trigger-Label.
 * @param {import('react').ReactNode} [props.hint] - kurzer Kontext rechts neben dem Titel.
 * @param {string} [props.panelId] - id des Panels (aria-controls/region).
 * @param {boolean} [props.disabled=false]
 * @param {import('react').ReactNode} [props.children] - Panel-Inhalt.
 * @param {string} [props.className]
 */
export default function AccordionSection({
  open = false,
  onToggle,
  no,
  title,
  hint,
  panelId,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  // WAI-ARIA Accordion-Keyboard (PO-R3): ↑/↓ wandert zwischen Geschwister-Headern,
  // Home/End erster/letzter; Enter/Space toggelt nativ (Fokus bleibt am Header).
  // ←/→ bewusst NICHT (gehört der TabBar-Roving-Nav). Scope = direkte Geschwister-
  // Sections (nested-safe), damit verschachtelte Accordions sich nicht vermischen.
  function handleKeyDown(e) {
    const keys = ['ArrowDown', 'ArrowUp', 'Home', 'End']
    if (!keys.includes(e.key)) return
    const group = e.currentTarget.closest('[data-ui="accordion-section"]')?.parentElement
    if (!group) return
    const triggers = [...group.children]
      .filter((c) => c.matches?.('[data-ui="accordion-section"]'))
      .map((s) => s.querySelector('[data-ui="accordion-section.trigger"]'))
      .filter((b) => b && !b.disabled)
    if (triggers.length === 0) return
    e.preventDefault()
    const i = triggers.indexOf(e.currentTarget)
    let next = i < 0 ? 0 : i
    if (e.key === 'ArrowDown') next = (next + 1) % triggers.length
    else if (e.key === 'ArrowUp') next = (next - 1 + triggers.length) % triggers.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = triggers.length - 1
    triggers[next]?.focus()
  }

  return (
    <section data-ui="accordion-section" className={`border-t border-[var(--border)] first:border-t-0 ${className}`} {...rest}>
      <button
        type="button"
        data-ui="accordion-section.trigger"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex min-h-[44px] w-full items-center gap-3 px-2 py-3 text-start [font-family:var(--font-display)] transition-colors duration-[var(--duration-fast)] hover:bg-[var(--state-hover)] active:scale-[0.998] focus-visible:outline-none focus-visible:shadow-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span data-ui="accordion-section.marker" aria-hidden="true" className="text-[var(--accent-primary)]">{open ? '▾' : '▸'}</span>
        <span data-ui="accordion-section.index" className="text-[13px] text-[var(--overlay1)]">[{no}]</span>
        <span data-ui="accordion-section.title" className="text-lg font-bold text-[var(--text)]">{title}</span>
        {hint ? <span data-ui="accordion-section.hint" className="hidden truncate text-[12px] text-[var(--subtext0)] sm:inline">— {hint}</span> : null}
      </button>
      <div className={`grid transition-[grid-template-rows] duration-[var(--duration-base)] ease-[var(--ease-standard)] ${open ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'}`}>
        <div className="overflow-hidden">
          <div
            data-ui="accordion-section.panel"
            id={panelId}
            role="region"
            aria-hidden={!open}
            className="border-t border-dashed border-[var(--border)]"
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  )
}
