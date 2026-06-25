import { Terminal, Copy, Check, ChevronRight } from 'lucide-react'
import useCopyFeedback from '../../../hooks/useCopyFeedback.js'

/**
 * TodoCliHelp — kompakte, kollabierbare devd-cli-todo-Referenz (DD-492).
 *
 * Power-User-Convenience im ToDo-Bereich (OverviewTab + SOLL-Story): zeigt die
 * todo-Subcommands (list / add(create) / edit(update)) als kopierbare Referenz.
 * Reine Anzeige — keine CLI-Verben, kein Verhalten. Die Kommando-Strings spiegeln
 * `bin/devd-cli.js` (todo-Subcommand seit DD-308); add = create, edit = update.
 *
 * Native <details>/<summary> → klick- UND tastatur-bedienbar ohne JS-State.
 * Token-clean (0 inline-style/hex), Catppuccin-Tokens, low-emphasis.
 *
 * @param {object} props
 * @param {string} [props.dataUiScope='project-home.todos.cli'] - data-ui-Präfix
 */

// Spiegelt bin/devd-cli.js (Usage-Strings, DD-308). Acceptance verlangt
// list/create/update — die echten Verben sind list / add / edit.
const COMMANDS = [
  { cmd: 'devd-cli todo list [--status open|done|cancelled]', note: 'list' },
  { cmd: 'devd-cli todo add "<label>" [--details <text>]', note: 'create' },
  { cmd: 'devd-cli todo edit <id> [--title "..."] [--status open|done|cancelled]', note: 'update' },
]

function CliRow({ cmd, note, scope }) {
  // DD-675: einheitliches Feedback (transienter Check + Toast) via Hook.
  const { copied, copy } = useCopyFeedback()
  const handleCopy = () => copy(cmd, 'Kommando kopiert')
  return (
    <li
      data-ui={`${scope}.row`}
      className="flex items-center gap-[var(--space-2,8px)]"
    >
      <code className="flex-1 min-w-0 truncate font-mono text-[11px] text-[var(--subtext1)]">
        {cmd}
      </code>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Kommando kopieren: ${note}`}
        title={copied ? 'Kopiert' : 'Kopieren'}
        data-ui={`${scope}.row.copy`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity hover:opacity-80 text-[var(--subtext0)]"
      >
        {copied ? (
          <Check size={12} aria-hidden="true" className="text-[var(--accent-success)]" />
        ) : (
          <Copy size={12} aria-hidden="true" />
        )}
      </button>
    </li>
  )
}

export default function TodoCliHelp({ dataUiScope = 'project-home.todos.cli' }) {
  return (
    <details
      data-ui={dataUiScope}
      className="group rounded-lg border border-[var(--surface1)] bg-[var(--base)] px-3 py-2 text-[var(--subtext0)]"
    >
      <summary
        data-ui={`${dataUiScope}.toggle`}
        className="flex cursor-pointer list-none items-center gap-[var(--space-2,8px)] text-[11px] uppercase tracking-wide outline-none focus-visible:underline"
      >
        <ChevronRight
          size={12}
          aria-hidden="true"
          className="transition-transform group-open:rotate-90"
        />
        <Terminal size={12} aria-hidden="true" />
        <span>CLI</span>
      </summary>
      <ul
        data-ui={`${dataUiScope}.list`}
        className="m-0 mt-2 flex list-none flex-col gap-[var(--space-1,4px)] p-0"
      >
        {COMMANDS.map((c) => (
          <CliRow key={c.note} cmd={c.cmd} note={c.note} scope={dataUiScope} />
        ))}
      </ul>
    </details>
  )
}
