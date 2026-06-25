/**
 * ProjectionSection — kanonisches, token-sauberes Organism (DD-481 Extract aus
 * src/components/projectHome/tabs/SstdTab.jsx → Inline-Komponente `ProjectionSection`).
 *
 * Domänen-bewusste Einheit: rendert eine read-only SSTD-Projektion (z.B.
 * „Nächste Schritte" ← offene ToDos, „Journal" ← session_notes). Titel + ein
 * „automatisch generiert · read-only"-Lock-Badge, darunter der gerenderte
 * Markdown-Inhalt. Collapsible: ein Klick auf den Kopf klappt den Inhalt ein/aus.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Die
 * gehobene Kopplung gegenüber der Quelle:
 *  - Quelle bezog `content` aus dem SstdTab-State, der via `getSstdProjections`
 *    (lib/projectHomeApi.js) geladen wurde. Diese Daten-Kopplung ist hier zur
 *    Prop `content` gehoben — die Komponente kennt keinen API-Layer mehr.
 *  - `renderMarkdown` (lib/markdown.js, reiner Renderer ohne Daten-/Netz-Kopplung)
 *    bleibt importiert. „Reines Render" gemäß Task-Vorgabe: der Inhalt ist
 *    read-only, daher direkt gerendertes Markdown statt eines MarkdownField-
 *    Edit/Preview-Toggles (das einen Editier-Affordance vortäuschen würde).
 *
 * Ephemerer UI-State: `collapsed` (useState) für den Einklapp-Zustand. Kein
 * Daten-State.
 *
 * @param {object} props
 * @param {string} props.title - Sektions-Überschrift (z.B. „Nächste Schritte")
 * @param {string} [props.content=''] - Markdown-Roh-Text der Projektion
 * @param {boolean} [props.defaultCollapsed=false] - Start eingeklappt?
 * @param {string} [props.lockLabel='automatisch generiert · read-only'] - Badge-Text
 * @param {string} [props.emptyLabel='leer'] - Hinweis bei leerem Inhalt
 * @param {string} [props.dataUiScope='projection-section'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen am Wurzel-Element
 */

import { useState } from 'react'
import { Lock, ChevronDown, ChevronRight } from 'lucide-react'
import { renderMarkdown } from '../../../lib/markdown.js'

export default function ProjectionSection({
  title,
  content = '',
  defaultCollapsed = false,
  lockLabel = 'automatisch generiert · read-only',
  emptyLabel = 'leer',
  dataUiScope = 'projection-section',
  className = '',
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed)
  const Chevron = collapsed ? ChevronRight : ChevronDown

  return (
    <section data-ui={dataUiScope} className={`mb-6 ${className}`}>
      <div
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((c) => !c)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setCollapsed((c) => !c)
          }
        }}
        data-ui={`${dataUiScope}.head`}
        className="flex items-center gap-2 mb-2 cursor-pointer select-none"
      >
        <Chevron size={15} aria-hidden="true" className="shrink-0 text-[var(--subtext0)]" />
        <h3 data-ui={`${dataUiScope}.title`} className="text-[15px] font-semibold m-0 flex-1 min-w-0">
          {title}
        </h3>
        <span
          data-ui={`${dataUiScope}.lock`}
          title="Wird automatisch generiert und ist nicht editierbar"
          className="inline-flex items-center gap-1 shrink-0 rounded-md border border-[var(--surface2)] px-2 py-0.5 text-[11px] text-[var(--subtext0)]"
        >
          <Lock size={11} aria-hidden="true" />
          {lockLabel}
        </span>
      </div>

      {!collapsed &&
        (content ? (
          <div
            data-ui={`${dataUiScope}.content`}
            className="text-sm leading-relaxed text-[var(--text)]"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        ) : (
          <p data-ui={`${dataUiScope}.empty`} className="text-sm italic text-[var(--subtext0)]">
            {emptyLabel}
          </p>
        ))}
    </section>
  )
}
