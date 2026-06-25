/**
 * ArchonLogPanel — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/ArchonLogPanel.jsx).
 *
 * Domänen-bewusste Einheit: rendert das Live-Log eines Archon-Runs — eine
 * collapsible Panel-Box mit Verbindungs-Status-Indikator und einer
 * gescrollten Liste typisierter JSONL-Event-Zeilen (workflow_start, node_start,
 * tool, assistant, node_complete, workflow_complete, workflow_error).
 *
 * PRESENTATIONAL (D-Phase3-01): kein WebSocket, kein Daten-Fetch. Die gehobene
 * Kopplung gegenüber der Quelle:
 *  - Quelle rief `useArchonRunStream(runId)` auf (öffnet eine WebSocket auf
 *    `/ws/archon/:runId`, akkumuliert `events` und führt einen `status`-State
 *    `idle|connecting|streaming|ended|error`). Diese gesamte Live-Kopplung ist
 *    hier zu reinen Props gehoben: `logs` (Array der bereits geparsten Event-
 *    Objekte, ersetzt `events`) + `connected` (bool: true ≙ Stream aktiv/Live,
 *    false ≙ beendet/getrennt, ersetzt den abgeleiteten Status-Dot/Label).
 *  - `runId` bleibt eine reine Anzeige-/Guard-Prop (kein Verbindungsaufbau mehr);
 *    ist sie leer, rendert die Komponente nichts (wie die Quelle).
 *
 * Ephemerer UI-State (bleibt lokal): `open` (Collapse-Toggle), `autoScroll`
 * (Auto-Folgen am Listenende, via useRef/useEffect/onScroll). Das ist kein
 * Daten-State.
 *
 * @param {object} props
 * @param {string} [props.runId] - Run-Bezeichner (Anzeige + Guard: leer → null-Render)
 * @param {Array<object>} [props.logs=[]] - geparste JSONL-Event-Objekte (je { type, ... })
 * @param {boolean} [props.connected=false] - true → Stream aktiv ("Live"), false → "Beendet"
 * @param {boolean} [props.defaultOpen=false] - initialer Collapse-Zustand
 * @param {string} [props.dataUiScope='archon-log-panel'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useEffect, useRef, useState } from 'react'

// Eine einzelne typisierte Event-Zeile. Rohe Catppuccin-Farbnamen der Quelle
// (mantle/sapphire/green/red/yellow/overlay1) → semantische Tokens.
function EventRow({ evt, scope }) {
  switch (evt.type) {
    case 'workflow_start':
      return (
        <div
          data-ui={`${scope}.event.workflow-start`}
          className="px-3 py-1.5 bg-[var(--surface0)] text-[var(--subtext1)] text-xs font-medium"
        >
          Workflow gestartet:{' '}
          <span className="text-[var(--text)] font-semibold">{evt.workflow_id ?? ''}</span>
        </div>
      )
    case 'node_start':
      return (
        <div
          data-ui={`${scope}.event.node-start`}
          className="px-3 py-1 text-xs text-[var(--accent-info)] font-semibold border-t border-[var(--surface1)] pt-2 mt-1"
        >
          Agent: {evt.node}
        </div>
      )
    case 'tool':
      return (
        <div data-ui={`${scope}.event.tool`} className="px-3 py-0.5 text-xs flex gap-2 items-start">
          <span className="inline-block shrink-0 px-1.5 py-0.5 rounded bg-[var(--surface1)] text-[var(--accent-info)] font-mono">
            {evt.tool_name}
          </span>
          <span className="text-[var(--subtext0)] truncate max-w-xs">
            {JSON.stringify(evt.tool_input ?? {}).slice(0, 120)}
          </span>
        </div>
      )
    case 'assistant':
      return (
        <div
          data-ui={`${scope}.event.assistant`}
          className="px-3 py-1 text-xs text-[var(--text)] whitespace-pre-wrap break-words max-w-full"
        >
          {String(evt.content ?? '').slice(0, 400)}
          {String(evt.content ?? '').length > 400 ? ' …' : ''}
        </div>
      )
    case 'node_complete':
      return (
        <div
          data-ui={`${scope}.event.node-complete`}
          className="px-3 py-0.5 text-xs text-[var(--accent-success)] flex gap-3"
        >
          <span>✓ {evt.node}</span>
          {evt.duration_ms && (
            <span className="text-[var(--subtext0)]">{(evt.duration_ms / 1000).toFixed(1)}s</span>
          )}
          {evt.tokens && <span className="text-[var(--subtext0)]">{evt.tokens} tokens</span>}
        </div>
      )
    case 'workflow_complete':
      return (
        <div
          data-ui={`${scope}.event.workflow-complete`}
          className="px-3 py-2 text-[var(--accent-success)] text-xs font-semibold border-t border-[color-mix(in_srgb,var(--accent-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-success)_10%,transparent)]"
        >
          Workflow abgeschlossen
        </div>
      )
    case 'workflow_error':
      return (
        <div
          data-ui={`${scope}.event.workflow-error`}
          className="px-3 py-2 text-[var(--accent-danger)] text-xs font-semibold border-t border-[color-mix(in_srgb,var(--accent-danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-danger)_10%,transparent)]"
        >
          Workflow-Fehler: {evt.error ?? ''}
        </div>
      )
    default:
      return (
        <div data-ui={`${scope}.event.other`} className="px-3 py-0.5 text-xs text-[var(--subtext0)]">
          [{evt.type}]
        </div>
      )
  }
}

export default function ArchonLogPanel({
  runId,
  logs = [],
  connected = false,
  defaultOpen = false,
  dataUiScope = 'archon-log-panel',
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  if (!runId) return null

  const statusLabel = connected ? 'Live' : 'Beendet'
  const statusDotClass = connected
    ? 'bg-[var(--accent-success)] animate-pulse'
    : 'bg-[var(--surface2)]'

  return (
    <div
      data-ui={dataUiScope}
      className={`rounded-lg border border-[var(--surface1)] bg-[var(--surface0)] text-sm overflow-hidden ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        data-ui={`${dataUiScope}.toggle`}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--surface0)] hover:bg-[var(--surface1)] transition-colors text-left"
      >
        <span className="text-[var(--subtext1)] text-xs font-medium flex-1">Archon Run Log</span>
        <span
          data-ui={`${dataUiScope}.status`}
          className="flex items-center gap-1.5 text-xs text-[var(--subtext0)]"
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
          {statusLabel}
        </span>
        <span className="text-[var(--subtext0)] text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          data-ui={`${dataUiScope}.list`}
          className="max-h-64 overflow-y-auto py-1 space-y-0.5"
        >
          {logs.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--subtext0)]">
              {connected ? 'Warte auf Events…' : 'Keine Events.'}
            </div>
          )}
          {logs.map((evt, i) => (
            <EventRow key={i} evt={evt} scope={dataUiScope} />
          ))}
          {!autoScroll && (
            <button
              type="button"
              onClick={() => {
                setAutoScroll(true)
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
              }}
              data-ui={`${dataUiScope}.follow`}
              className="sticky bottom-0 w-full text-xs text-center py-1 bg-[color-mix(in_srgb,var(--surface1)_80%,transparent)] text-[var(--subtext1)] hover:text-[var(--text)]"
            >
              Folgen fortsetzen ↓
            </button>
          )}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}
