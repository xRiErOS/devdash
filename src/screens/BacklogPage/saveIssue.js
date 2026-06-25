// GF-2 T2 — saveIssue.js
// Pure, DI-getestete Orchestrierung des Issue-Edit-Speicherns. Aus useBacklog
// herausgezogen, damit das KRITISCHE Partial-Failure-Verhalten (PUT ok / Sprint-
// PATCH fail) in node-env ohne DOM/Hook-Harness testbar ist
// (tests/frontend-rework/backlog-save-issue.test.js).
//
// Kontrakt:
//  - Schritt 1: PUT /api/backlog/:id (Felder via buildUpdatePayloadFromFormValues,
//    KEIN sprint_id). Wirft der PUT → outcome 'update_failed' (Modal offen, KEIN reload).
//  - Sprint-PATCH NUR bei echter Änderung (nextSprint !== currentSprint).
//  - Schritt 2: PATCH /api/backlog/:id/sprint. Wirft der PATCH → Felder SIND schon
//    persistiert → outcome 'sprint_failed' (reload JA, differenzierte Meldung, Modal offen).
//  - Voller Erfolg → outcome 'ok' (reload JA, Modal zu).

import { buildUpdatePayloadFromFormValues, buildAssignSprintPayload } from './payloads.js'

/**
 * @param {object} args
 * @param {number} args.id - backlog.id
 * @param {object} args.values - IssueForm.onSubmit values (kann sprint_id tragen)
 * @param {number|null} args.currentSprint - aktueller assigned_sprint des Issues
 * @param {(url:string, method:string, body:object)=>Promise<any>} args.postJson - HTTP-Adapter
 * @returns {Promise<{outcome:'ok'|'update_failed'|'sprint_failed', message?:string, reloaded:boolean, sprintAttempted:boolean}>}
 */
export async function saveIssueRequest({ id, values, currentSprint, postJson }) {
  // Schritt 1: Felder-Update (PUT). Failure = harter Stop, kein reload.
  try {
    const updatePayload = buildUpdatePayloadFromFormValues(values)
    await postJson(`/api/backlog/${id}`, 'PUT', updatePayload)
  } catch (e) {
    return {
      outcome: 'update_failed',
      message: e?.message || 'Speichern fehlgeschlagen',
      reloaded: false,
      sprintAttempted: false,
    }
  }

  // Sprint-Änderung erkennen.
  const hasSprintField = Object.prototype.hasOwnProperty.call(values ?? {}, 'sprint_id')
  const nextSprint = values?.sprint_id == null ? null : Number(values.sprint_id)
  const cur = currentSprint == null ? null : Number(currentSprint)
  const sprintChanged = hasSprintField && nextSprint !== cur

  if (!sprintChanged) {
    return { outcome: 'ok', reloaded: true, sprintAttempted: false }
  }

  // Schritt 2: Sprint-(Re)Zuordnung (PATCH). Felder sind bereits gespeichert.
  try {
    await postJson(`/api/backlog/${id}/sprint`, 'PATCH', buildAssignSprintPayload(values.sprint_id))
  } catch (e) {
    const msg = e?.message || 'Sprint-Zuweisung fehlgeschlagen'
    return {
      outcome: 'sprint_failed',
      message: `Felder gespeichert, Sprint-Zuweisung fehlgeschlagen: ${msg}`,
      reloaded: true,
      sprintAttempted: true,
    }
  }

  return { outcome: 'ok', reloaded: true, sprintAttempted: true }
}
