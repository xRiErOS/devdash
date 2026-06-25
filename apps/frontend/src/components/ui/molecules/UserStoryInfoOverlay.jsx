import { useState } from 'react'
import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import IconButton from '../atoms/IconButton.jsx'
import Modal from './Modal.jsx'

/**
 * UserStoryInfoOverlay — Info-Icon je US-Row; Klick oeffnet ein zentriertes Modal
 * (Library-Overlay, DD#61 Modal-Atom) mit ALLEN Feldern der User Story als
 * Pruefgrundlage: Titel (Header) + Beschreibung (details) + Akzeptanzkriterien (qa).
 * Praesentational, controlled optional (open/onToggle) oder uncontrolled (lokaler State).
 *
 * #7-Rework (2026-06-22): vorher absolute w-80 Popover (lief am Viewport-Rand raus) +
 * nur qa. Jetzt viewport-sicheres zentriertes Modal mit allen US-Feldern.
 *
 * data-ui: sprint-review.panel.us-info (am Trigger-Button, forwarded via IconButton ...rest).
 * Modal-Body nutzt die zentralen modal.*-Anker (kein neuer Panel-Anker noetig).
 */
export default function UserStoryInfoOverlay({ storyKey, title, details, qa, open: openProp, onToggle }) {
  const [local, setLocal] = useState(false)
  const open = openProp ?? local
  const onTrigger = onToggle ?? (() => setLocal((v) => !v))
  const onClose = onToggle ?? (() => setLocal(false))
  return (
    <span className="inline-flex">
      <IconButton
        data-ui="sprint-review.panel.us-info"
        icon={<Icon name="info" role="info" size={14} />}
        label={`Details ${storyKey}`}
        aria-expanded={open}
        size="sm"
        variant="ghost"
        onClick={onTrigger}
      />
      <Modal
        open={open}
        onClose={onClose}
        size="sm"
        title={title ? `${storyKey} — ${title}` : `User Story ${storyKey}`}
      >
        <div className="space-y-3 text-sm">
          {details && (
            <div data-ui="sprint-review.panel.us-info.details">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--overlay0)]">Beschreibung</span>
              <p className="m-0 mt-1 whitespace-pre-wrap text-[var(--subtext0)]">{details}</p>
            </div>
          )}
          {qa && (
            <div data-ui="sprint-review.panel.us-info.qa">
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--overlay0)]">QA-Kriterien</span>
              <p className="m-0 mt-1 whitespace-pre-wrap text-[var(--subtext0)]">{qa}</p>
            </div>
          )}
          {!details && !qa && (
            <p className="m-0 text-[var(--subtext0)]">Keine weiteren Angaben.</p>
          )}
        </div>
      </Modal>
    </span>
  )
}
