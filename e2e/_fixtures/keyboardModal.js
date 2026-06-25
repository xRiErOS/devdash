/* global document */
import { expect } from '@playwright/test'

// DD-472 follow-up (B05): robustes Öffnen des IssueCreateModals via globalem 'c'-Hotkey.
//
// Root-Cause des webkit-Flakes (e2e/dd271, e2e/dd272): NICHT der Shortcut selbst —
// `c` öffnet das Modal nach Page-Settle 12/12 auf webkit UND chromium. Das Problem
// ist ein Mount-Race: die Specs pressen 'c' UNMITTELBAR nachdem `roadmap-board.root`
// sichtbar wird. Zu diesem Zeitpunkt hat der globale `useKeyboardShortcuts`-useEffect
// im Layout den window-keydown-Listener (mit dem 'c'-Handler) noch nicht zuverlässig
// registriert. Das keydown feuert zwar im DOM, läuft aber ins Leere → Modal bleibt zu.
// Auf webkit trifft das Race in beiden CI-Versuchen, auf chromium nur sporadisch
// (retry-grün) → die beobachtete „flaky vs hard-fail"-Asymmetrie.
//
// Fix: nach dem Page-Anker das 'c' pressen und auf den Dialog warten; verschluckt das
// Mount-Race das erste Event, das 'c' bis zum Timeout erneut pressen. Maskiert KEIN
// echtes Versagen — wäre der Shortcut wirklich kaputt, würde der Helper nach Ablauf
// des Gesamt-Timeouts trotzdem fehlschlagen.
export async function openIssueCreateModal(page, { timeout = 8000 } = {}) {
  const heading = page.getByRole('heading', { name: 'Neues Issue erstellen' }).first()
  // Fokus aus etwaigen Inputs ziehen, sonst greift der isInForm()-Guard im Hook.
  await page.evaluate(() => document.activeElement?.blur?.())

  const deadline = Date.now() + timeout
  // Erster Press; danach pollen + ggf. nachpressen, bis der Dialog erscheint.
  await page.keyboard.press('c')
  while (Date.now() < deadline) {
    if (await heading.count() > 0) break
    await page.waitForTimeout(120)
    if (await heading.count() > 0) break
    // Mount-Race: Listener war beim ersten keydown evtl. noch nicht aktiv → nachpressen.
    await page.evaluate(() => document.activeElement?.blur?.())
    await page.keyboard.press('c')
  }
  await expect(heading).toBeVisible({ timeout: 1500 })
  return heading
}
