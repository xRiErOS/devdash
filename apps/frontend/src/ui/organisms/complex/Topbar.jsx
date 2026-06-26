/**
 * Topbar — obere Shell-Leiste (44px): Breadcrumb links, Command-Bar mittig
 * (zentriert), Theme-Toggle rechts. Liegt auf der mantle-Fläche mit unterer
 * Trennlinie. Presentational, props-driven.
 *
 * Komposition: `Breadcrumb` + `CommandBar` (Molecules) + `IconButton` (Atom).
 * Toast/Command-Palette sind NICHT Teil dieses Organisms (Slice 6).
 *
 * @param {object} props
 * @param {Array<{label:React.ReactNode,kind?:'issue'|'sprint'|'milestone',last?:boolean}>} [props.breadcrumb=[]]
 * @param {React.ReactNode} [props.commandPlaceholder='Suchen, springen, Befehl …']
 * @param {string[]} [props.shortcut=['⌘','K']]
 * @param {string} [props.dataUiScope='organism.topbar']
 */
import Breadcrumb from '../../molecules/Breadcrumb.jsx'
import CommandBar from '../../molecules/CommandBar.jsx'
import IconButton from '../../atoms/IconButton.jsx'

export default function Topbar({
  breadcrumb = [],
  commandPlaceholder = 'Suchen, springen, Befehl …',
  shortcut = ['⌘', 'K'],
  dataUiScope = 'organism.topbar',
}) {
  return (
    <div
      data-ui={dataUiScope}
      className="flex items-center gap-[var(--space-3)] h-[44px] px-[var(--space-4)] border-b border-[var(--border)] bg-[var(--mantle)]"
    >
      <Breadcrumb segments={breadcrumb} dataUiScope={`${dataUiScope}.breadcrumb`} />
      <div data-ui={`${dataUiScope}.command`} className="flex-1 flex justify-center">
        <CommandBar
          placeholder={commandPlaceholder}
          shortcut={shortcut}
          dataUiScope={`${dataUiScope}.command.bar`}
        />
      </div>
      <IconButton iconName="theme-dark" label="Theme" dataUiScope={`${dataUiScope}.theme`} />
    </div>
  )
}
