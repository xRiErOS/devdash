/**
 * TesterLinkCard — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/settings/TesterLinkCard.jsx, DD-269/DD-371/DD-392).
 *
 * Domänen-bewusste Einheit (Domäne: Projekt-Capture/Tester-Deeplink): rendert
 * den öffentlichen PWA-Issue-Catcher-Deeplink eines Projekts
 * (`https://issues.familie-riedel.org/catch/<slug>`), einen Public-Capture-Toggle
 * (DD-392) und eine readonly URL-Zeile mit Clipboard-Copy. Komponiert die Atoms
 * Card, CardHead, Input, Button.
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Gehobene
 * Kopplung gegenüber der Quelle:
 *  - Quelle besaß `isPublic`/`saving`/`error` als lokalen Daten-State und rief
 *    `fetch('/api/projects/:id', { method:'PUT', body:{public_capture} })` direkt
 *    auf (`handleToggle`). Diese Mutation ist hier zur Callback-Prop
 *    `onTogglePublic(next:boolean)` gehoben; `isPublic`, `saving`, `error`
 *    kommen als reine Props rein. Der Konsument führt den API-Call aus und meldet
 *    das Ergebnis zurück.
 *  - Quelle leitete den `slug`/`projectId` aus dem `project`-Objekt ab → hier
 *    als reine Props `slug` (Pflicht) und `disabled` (statt projectId==null-Guard).
 *  - Die `url` wird weiterhin lokal aus `baseUrl` + `slug` formatiert (reiner
 *    Formatter, keine Daten-Kopplung).
 *
 * Ephemerer UI-State BLEIBT lokal: `copied` (Copy-Feedback). Der Clipboard-Copy
 * (navigator.clipboard mit textarea/execCommand-Fallback für nicht-HTTPS) ist
 * Browser-API, kein Daten-Fetch → bleibt im Organism.
 *
 * @param {object} props
 * @param {string} props.slug - Projekt-Slug für den Deeplink (Pflicht)
 * @param {string} [props.baseUrl='https://issues.familie-riedel.org'] - Basis-URL des Capture-Hosts
 * @param {boolean} [props.isPublic=false] - public_capture-Status (DD-392)
 * @param {boolean} [props.saving=false] - Toggle-Mutation in-flight → disabled + Dimming
 * @param {boolean} [props.disabled=false] - Toggle generell deaktiviert (z.B. kein projectId)
 * @param {string|null} [props.error=null] - Fehlermeldung der letzten Toggle-Mutation
 * @param {(next:boolean)=>void} [props.onTogglePublic] - Public-Capture-Mutation (gehoben)
 * @param {string} [props.dataUiScope='tester-link-card'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen
 */

import { useState } from 'react'
import Card from '../atoms/Card.jsx'
import CardHead from '../atoms/CardHead.jsx'
import Input from '../atoms/Input.jsx'
import Button from '../atoms/Button.jsx'

export default function TesterLinkCard({
  slug,
  baseUrl = 'https://issues.familie-riedel.org',
  isPublic = false,
  saving = false,
  disabled = false,
  error = null,
  onTogglePublic,
  dataUiScope = 'tester-link-card',
  className = '',
}) {
  // Ephemerer UI-State: Copy-Feedback ("kopiert" für 1.8s).
  const [copied, setCopied] = useState(false)

  const url = `${baseUrl}/catch/${slug}`
  const toggleDisabled = saving || disabled

  // Clipboard-Copy mit Fallback (nicht-HTTPS-Dev): textarea + execCommand.
  async function handleCopy() {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        const ta = document.createElement('textarea')
        ta.value = url
        ta.className = 'fixed -left-[9999px]'
        document.body.appendChild(ta)
        ta.select()
        try {
          document.execCommand('copy')
        } catch {
          /* swallow */
        }
        document.body.removeChild(ta)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card
      tone="crust"
      bordered={false}
      padding="none"
      data-testid="tester-link-card"
      data-ui={dataUiScope}
      className={`rounded-xl p-5 mb-4 ${className}`}
    >
      <CardHead
        data-ui={`${dataUiScope}.heading`}
        title="Tester-Deeplink"
      />
      <p data-ui={`${dataUiScope}.description`} className="text-xs mb-3 text-[var(--subtext1)]">
        Direkter PWA-Issue-Catcher für dieses Projekt. Teile diese URL mit externen Testern —
        Project-Selector entfällt, alle Erfassungen landen direkt im richtigen Backlog.
      </p>

      {/* DD-392: Öffentliche Freigabe (Default aus). */}
      <label
        data-testid="public-capture-toggle"
        data-ui={`${dataUiScope}.public-capture`}
        className={`flex items-start gap-3 mb-3 cursor-pointer ${saving ? 'opacity-60' : ''}`}
      >
        <input
          type="checkbox"
          checked={isPublic}
          disabled={toggleDisabled}
          onChange={() => onTogglePublic?.(!isPublic)}
          data-testid="public-capture-checkbox"
          data-ui={`${dataUiScope}.public-capture.checkbox`}
          className="mt-0.5 shrink-0 w-[18px] h-[18px]"
        />
        <span className="text-xs text-[var(--subtext0)]">
          <span className="font-medium text-[var(--text)]">Öffentlich exponieren</span>
          {' — '}der Deeplink ist aus dem Internet erreichbar. Nur aktivieren, wenn externe Tester
          ohne Login Issues anlegen sollen. Solange aus, liefert die URL 404 und das Projekt
          erscheint in keiner öffentlichen Liste.
        </span>
      </label>

      {!isPublic && (
        <p
          data-testid="tester-link-inactive-note"
          data-ui={`${dataUiScope}.inactive-note`}
          className="text-xs mb-3 rounded-lg px-3 py-2 bg-[var(--surface0)] text-[var(--accent-warning)]"
        >
          Deeplink inaktiv — Projekt ist nicht öffentlich freigegeben.
        </p>
      )}

      {error && (
        <p data-ui={`${dataUiScope}.error`} className="text-xs mb-2 text-[var(--accent-danger)]">
          {error}
        </p>
      )}

      <div data-ui={`${dataUiScope}.row`} className="flex items-center gap-2">
        <Input
          type="text"
          value={url}
          readOnly
          data-testid="tester-link-input"
          data-ui={`${dataUiScope}.url`}
          className={`flex-1 font-mono ${isPublic ? 'text-[var(--text)]' : 'text-[var(--subtext1)]'}`}
        />
        <Button
          variant={copied ? 'primary' : 'secondary'}
          size="lg"
          onClick={handleCopy}
          aria-label="Tester-Link kopieren"
          data-testid="tester-link-copy"
          data-ui={`${dataUiScope}.copy`}
        >
          {copied ? 'kopiert' : 'kopieren'}
        </Button>
      </div>
    </Card>
  )
}
