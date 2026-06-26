/**
 * CommandPalette — Codium-Stil-Befehlsliste (Popover unter der Suche): oben die
 * Befehle (mit Mnemonic + Shortcut-Chips), darunter zuletzt geöffnete Einträge.
 * Konkreter Organism, presentational, props-driven.
 *
 * Komposition: `Kbd` (Shortcut-Tasten) + `Icon` (Recent-Glyphen). Reine Karte,
 * KEIN eigener Scrim — der Consumer positioniert sie an ihrem Anker.
 *
 * @param {object} props
 * @param {Array<{label:React.ReactNode,mnemonic?:string,keys?:string[]}>} [props.commands]
 * @param {Array<{icon:string,name:React.ReactNode,path:React.ReactNode,meta?:string}>} [props.recent]
 * @param {string} [props.dataUiScope='organism.commandPalette']
 */
import Icon from '../../foundations/Icon.jsx'
import Kbd from '../../atoms/Kbd.jsx'

const DEFAULT_CMDS = [
  { label: 'Zu Issue springen', mnemonic: '@', keys: ['⌘', 'P'] },
  { label: 'Befehl ausführen', mnemonic: '>', keys: ['⇧', '⌘', 'P'] },
  { label: 'Zu Sprint springen', mnemonic: ':' },
  { label: 'Volltext suchen', mnemonic: '%' },
  { label: 'Neues Issue', keys: ['⌘', 'N'] },
  { label: 'Mehr …', mnemonic: '?' },
]
const DEFAULT_RECENT = [
  { icon: 'type-chore', name: 'DD2-7 Capture-Host härten', path: 'DD#49 · Capture-Sprint', meta: 'zuletzt geöffnet' },
  { icon: 'type-feature', name: 'DD2-8 Render-Smoke erweitern', path: 'DD#49 · Capture-Sprint' },
  { icon: 'board', name: 'DD#50 Mobile-Sprint', path: 'M3 · Mobile-Track' },
  { icon: 'milestone', name: 'M3 Mobile-Track', path: 'Roadmap' },
]

export default function CommandPalette({
  commands = DEFAULT_CMDS,
  recent = DEFAULT_RECENT,
  dataUiScope = 'organism.commandPalette',
}) {
  return (
    <div
      data-ui={dataUiScope}
      role="listbox"
      aria-label="Befehlspalette"
      className="flex flex-col bg-[var(--mantle)] border border-[var(--border)] rounded-lg shadow-[var(--shadow-pop)] overflow-hidden w-[520px] max-w-full"
    >
      <div data-ui={`${dataUiScope}.list`} className="flex flex-col p-[var(--space-1)]">
        {commands.map((c, i) => (
          <div
            key={String(c.label)}
            data-ui={`${dataUiScope}.cmd-${c.label}`}
            role="option"
            aria-selected={i === 0}
            className={`flex items-center gap-2 px-2 py-1 rounded-sm text-[13px] ${i === 0 ? 'bg-[var(--state-active)]' : ''}`}
          >
            <span className="whitespace-nowrap text-[var(--text)]">{c.label}</span>
            {c.mnemonic && <span className="[font-family:var(--font-display)] text-[12px] text-[var(--subtext0)]">{c.mnemonic}</span>}
            <span className="flex-1" />
            {c.keys && (
              <span className="inline-flex gap-[3px]">
                {c.keys.map((k, ki) => (
                  <Kbd key={ki} dataUiScope={`${dataUiScope}.cmd-${c.label}.key-${ki}`}>{k}</Kbd>
                ))}
              </span>
            )}
          </div>
        ))}

        <div data-ui={`${dataUiScope}.divider`} className="h-px my-1 bg-[var(--border)]" />

        {recent.map((r) => (
          <div
            key={String(r.name)}
            data-ui={`${dataUiScope}.recent-${r.name}`}
            role="option"
            className="flex items-center gap-2 px-2 py-1 rounded-sm text-[13px]"
          >
            <Icon name={r.icon} size={14} mono />
            <span className="whitespace-nowrap text-[var(--text)]">{r.name}</span>
            <span className="text-[11px] text-[var(--subtext0)] truncate">{r.path}</span>
            <span className="flex-1" />
            {r.meta && <span className="text-[11px] text-[var(--subtext0)]">{r.meta}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
