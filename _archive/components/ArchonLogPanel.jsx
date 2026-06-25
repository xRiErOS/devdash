import { useEffect, useRef, useState } from 'react'
import { useArchonRunStream } from '../hooks/useArchonRunStream'

function EventRow({ evt }) {
  switch (evt.type) {
    case 'workflow_start':
      return (
        <div className="px-3 py-1.5 bg-mantle text-subtext1 text-xs font-medium">
          Workflow gestartet: <span className="text-text font-semibold">{evt.workflow_id ?? ''}</span>
        </div>
      )
    case 'node_start':
      return (
        <div className="px-3 py-1 text-xs text-sapphire font-semibold border-t border-surface1 pt-2 mt-1">
          Agent: {evt.node}
        </div>
      )
    case 'tool':
      return (
        <div className="px-3 py-0.5 text-xs flex gap-2 items-start">
          <span className="inline-block shrink-0 px-1.5 py-0.5 rounded bg-surface1 text-sapphire font-mono">
            {evt.tool_name}
          </span>
          <span className="text-subtext0 truncate max-w-xs">
            {JSON.stringify(evt.tool_input ?? {}).slice(0, 120)}
          </span>
        </div>
      )
    case 'assistant':
      return (
        <div className="px-3 py-1 text-xs text-text whitespace-pre-wrap break-words max-w-full">
          {String(evt.content ?? '').slice(0, 400)}
          {String(evt.content ?? '').length > 400 ? ' …' : ''}
        </div>
      )
    case 'node_complete':
      return (
        <div className="px-3 py-0.5 text-xs text-green flex gap-3">
          <span>✓ {evt.node}</span>
          {evt.duration_ms && <span className="text-subtext0">{(evt.duration_ms / 1000).toFixed(1)}s</span>}
          {evt.tokens && <span className="text-subtext0">{evt.tokens} tokens</span>}
        </div>
      )
    case 'workflow_complete':
      return (
        <div className="px-3 py-2 bg-green/10 text-green text-xs font-semibold border-t border-green/30">
          Workflow abgeschlossen
        </div>
      )
    case 'workflow_error':
      return (
        <div className="px-3 py-2 bg-red/10 text-red text-xs font-semibold border-t border-red/30">
          Workflow-Fehler: {evt.error ?? ''}
        </div>
      )
    default:
      return (
        <div className="px-3 py-0.5 text-xs text-overlay1">
          [{evt.type}]
        </div>
      )
  }
}

const STATUS_LABEL = {
  idle: '',
  connecting: 'Verbinde…',
  streaming: 'Live',
  ended: 'Beendet',
  error: 'Fehler',
}

const STATUS_DOT = {
  idle: '',
  connecting: 'bg-yellow',
  streaming: 'bg-green animate-pulse',
  ended: 'bg-surface2',
  error: 'bg-red',
}

export default function ArchonLogPanel({ runId, defaultOpen = false }) {
  const { events, status } = useArchonRunStream(runId)
  const [open, setOpen] = useState(defaultOpen)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef(null)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [events, autoScroll])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setAutoScroll(atBottom)
  }

  if (!runId) return null

  return (
    <div className="rounded-lg border border-surface1 bg-surface0 text-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-mantle hover:bg-surface1 transition-colors text-left"
      >
        <span className="text-subtext1 text-xs font-medium flex-1">Archon Run Log</span>
        {STATUS_LABEL[status] && (
          <span className="flex items-center gap-1.5 text-xs text-subtext0">
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status]}
          </span>
        )}
        <span className="text-overlay1 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="max-h-64 overflow-y-auto py-1 space-y-0.5"
        >
          {events.length === 0 && status === 'connecting' && (
            <div className="px-3 py-2 text-xs text-subtext0">Warte auf Events…</div>
          )}
          {events.length === 0 && status === 'streaming' && (
            <div className="px-3 py-2 text-xs text-subtext0">Keine Events bisher…</div>
          )}
          {events.map((evt, i) => (
            <EventRow key={i} evt={evt} />
          ))}
          {!autoScroll && (
            <button
              onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
              className="sticky bottom-0 w-full text-xs text-center py-1 bg-surface1/80 text-subtext1 hover:text-text"
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
