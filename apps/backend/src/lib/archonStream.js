import fs from 'node:fs'
import readline from 'node:readline'
import { spawn } from 'node:child_process'

const registry = new Map() // run_id -> { tail, subs:Set<WS>, buffer:Event[] }

function startTail(runId, logPath, entry, db) {
  const tail = spawn('tail', ['-n', '+1', '-F', logPath], {
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  entry.tail = tail

  const rl = readline.createInterface({ input: tail.stdout })
  rl.on('line', line => {
    let evt
    try { evt = JSON.parse(line) } catch { return }
    entry.buffer.push(evt)
    for (const ws of entry.subs) {
      if (ws.readyState === ws.OPEN) ws.send(line)
    }
    if (evt.type === 'workflow_complete' || evt.type === 'workflow_error') {
      const status = evt.type === 'workflow_complete' ? 'succeeded' : 'failed'
      db.prepare(
        "UPDATE archon_runs SET status=?, finished_at=datetime('now') WHERE run_id=?",
      ).run(status, runId)
      for (const ws of entry.subs) ws.close(1000, 'workflow ended')
      tail.kill('SIGTERM')
      registry.delete(runId)
    }
  })

  tail.on('exit', () => {
    if (registry.has(runId)) entry.tail = null
  })
}

export function attachStream(runId, logPath, db) {
  if (registry.has(runId)) return registry.get(runId)
  const entry = { tail: null, subs: new Set(), buffer: [] }
  registry.set(runId, entry)

  if (fs.existsSync(logPath)) {
    startTail(runId, logPath, entry, db)
  } else {
    let waited = 0
    const iv = setInterval(() => {
      waited += 500
      if (fs.existsSync(logPath)) {
        clearInterval(iv)
        startTail(runId, logPath, entry, db)
      } else if (waited >= 30000) {
        clearInterval(iv)
        for (const ws of entry.subs) ws.close(1011, 'log file never appeared')
        registry.delete(runId)
      }
    }, 500)
  }
  return entry
}

export function subscribe(runId, ws, db) {
  const row = db
    .prepare('SELECT log_path, status FROM archon_runs WHERE run_id=?')
    .get(runId)
  if (!row || !row.log_path) {
    ws.close(1008, 'unknown run')
    return
  }
  const entry = registry.get(runId) ?? attachStream(runId, row.log_path, db)
  for (const evt of entry.buffer) ws.send(JSON.stringify(evt))
  if (row.status === 'succeeded' || row.status === 'failed') {
    ws.close(1000, `already ${row.status}`)
    return
  }
  entry.subs.add(ws)
  ws.on('close', () => entry.subs.delete(ws))
}
