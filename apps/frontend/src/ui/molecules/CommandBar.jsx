/**
 * CommandBar — Such-/Command-Anzeige (presentational, kein echtes Input):
 * führendes Such-Icon, Placeholder-Text, rechts ein Shortcut-Hint.
 *
 * Komposition: nutzt `Icon` (Lupe) + das Atom `Kbd` (Shortcut). Reine Anzeige —
 * der echte Such-Flow lebt im Consumer/Organism. Props-driven.
 *
 * @param {object} props
 * @param {React.ReactNode} props.placeholder - Platzhaltertext
 * @param {string[]} [props.shortcut] - Tasten-Glyphen (z.B. ['⌘','K'])
 * @param {string} [props.dataUiScope='molecule.commandBar']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'
import Kbd from '../atoms/Kbd.jsx'

export default function CommandBar({ placeholder, shortcut, dataUiScope = 'molecule.commandBar', className = '' }) {
  return (
    <div
      data-ui={dataUiScope}
      className={`flex items-center gap-2 h-[34px] px-3 rounded-md bg-[var(--base)] border border-[var(--border)] max-w-[560px] ${className}`}
    >
      <Icon name="search" size={15} mono />
      <span data-ui={`${dataUiScope}.placeholder`} className="flex-1 text-[13px] text-[var(--subtext0)]">
        {placeholder}
      </span>
      {shortcut && shortcut.length > 0 && (
        <Kbd dataUiScope={`${dataUiScope}.shortcut`}>
          {shortcut.map((k) => <span key={String(k)}>{k}</span>)}
        </Kbd>
      )}
    </div>
  )
}
