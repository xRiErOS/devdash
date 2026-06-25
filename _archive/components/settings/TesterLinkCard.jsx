// DD-371 (T02/D04): Aus ProjectSettings.jsx herausgelöst nach src/components/settings/.
// DD-269 — Tester-Link Card. Zeigt deeplink-URL `https://issues.familie-riedel.org/catch/<slug>`
// plus Copy-Button. Bei Browsern ohne `navigator.clipboard` (z.B. nicht-HTTPS-Dev-Setup)
// wird ein Fallback per textarea+execCommand benutzt. Projektbezogen (leitet aus slug ab).
//
// DD-392 — public_capture-Toggle. issues.* ist öffentlich (Cloudflare). Der Deeplink
// funktioniert NUR, wenn das Projekt explizit öffentlich freigegeben ist (Default aus).
// Solange aus: /catch/<slug> liefert 404 und das Projekt taucht in keiner öffentlichen
// Liste auf. Der Toggle schreibt projects.public_capture via PUT /api/projects/:id.

import { useState } from 'react'

export default function TesterLinkCard({ project, slug: slugProp }) {
  const slug = project?.slug ?? slugProp
  const projectId = project?.id ?? null
  const url = `https://issues.familie-riedel.org/catch/${slug}`
  const [copied, setCopied] = useState(false)
  const [isPublic, setIsPublic] = useState(Boolean(project?.public_capture))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.style.position = 'fixed'
        ta.style.left = '-9999px'
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch { /* swallow */ }
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function handleToggle() {
    if (saving || projectId == null) return
    const next = !isPublic
    setSaving(true)
    setError(null)
    try {
      const resp = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ public_capture: next ? 1 : 0 }),
      })
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      setIsPublic(next)
    } catch (e) {
      setError(e.message || 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      data-testid="tester-link-card"
      data-ui="project-settings.tester-link.deeplink"
      className="rounded-xl p-5 mb-4"
      style={{ background: 'var(--mantle)' }}
    >
      <h2 data-ui="project-settings.tester-link.deeplink.heading" className="font-bold text-sm mb-2" style={{ color: 'var(--subtext0)' }}>
        Tester-Deeplink
      </h2>
      <p data-ui="project-settings.tester-link.deeplink.description" className="text-xs mb-3" style={{ color: 'var(--overlay0)' }}>
        Direkter PWA-Issue-Catcher für dieses Projekt. Teile diese URL mit externen Testern —
        Project-Selector entfällt, alle Erfassungen landen direkt im richtigen Backlog.
      </p>

      {/* DD-392: Öffentliche Freigabe (Default aus). */}
      <label
        data-testid="public-capture-toggle"
        data-ui="project-settings.tester-link.public-capture"
        className="flex items-start gap-3 mb-3 cursor-pointer"
        style={{ opacity: saving ? 0.6 : 1 }}
      >
        <input
          type="checkbox"
          checked={isPublic}
          disabled={saving || projectId == null}
          onChange={handleToggle}
          data-testid="public-capture-checkbox"
          className="mt-0.5 shrink-0"
          style={{ width: 18, height: 18 }}
        />
        <span className="text-xs" style={{ color: 'var(--subtext0)' }}>
          <span className="font-medium" style={{ color: 'var(--text)' }}>Öffentlich exponieren</span>
          {' — '}der Deeplink ist aus dem Internet erreichbar. Nur aktivieren, wenn externe Tester
          ohne Login Issues anlegen sollen. Solange aus, liefert die URL 404 und das Projekt
          erscheint in keiner öffentlichen Liste.
        </span>
      </label>

      {!isPublic && (
        <p
          data-testid="tester-link-inactive-note"
          className="text-xs mb-3 rounded-lg px-3 py-2"
          style={{ background: 'var(--surface0)', color: 'var(--peach)' }}
        >
          Deeplink inaktiv — Projekt ist nicht öffentlich freigegeben.
        </p>
      )}

      {error && (
        <p className="text-xs mb-2" style={{ color: 'var(--red)' }}>{error}</p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={url}
          readOnly
          data-testid="tester-link-input"
          data-ui="project-settings.tester-link.deeplink.url"
          className="flex-1 rounded-lg px-3 py-2 border-0 outline-none font-mono"
          style={{ background: 'var(--surface0)', color: isPublic ? 'var(--text)' : 'var(--overlay0)', fontSize: '14px' }}
        />
        <button
          type="button"
          onClick={handleCopy}
          data-testid="tester-link-copy"
          data-ui="project-settings.tester-link.deeplink.copy"
          aria-label="Tester-Link kopieren"
          className="rounded-lg px-3 py-2 font-medium"
          style={{
            background: copied ? 'var(--green)' : 'var(--blue)',
            color: 'var(--base)',
            minHeight: '40px',
            minWidth: '44px',
          }}
        >
          {copied ? 'kopiert' : 'kopieren'}
        </button>
      </div>
    </div>
  )
}
