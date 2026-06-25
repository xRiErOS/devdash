// DD-360 — Sprint-Complete-Block-Dialog rendert die blockierenden result-losen Issues.
//
// Bug: Beim Abschluss eines Sprints mit passed/done-Issues ohne result lieferte das
// Backend 422 mit { issue_keys, issues } — das Frontend verwarf die Liste und zeigte
// einen leeren Dialog. Fix: submitComplete parst body.issues bei 422 und der
// CompleteDialog rendert sie.
//
// Source-level grep (Pattern wie tests/dd289/r2): verifiziert die Verdrahtung ohne
// React-Render (environment: node).

import { describe, test, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const guard = readFileSync(join(ROOT, 'server/lib/sprintCompleteGuards.js'), 'utf8')

// DD-587: die frontend-seitigen submitComplete-/CompleteDialog-Source-Asserts
// gegen src/components/SprintActions.jsx sind gelöscht — die Legacy-SprintActions
// wurde ins _archive verschoben (import-closed dead set; die Live-Variante ist
// ui/organisms/SprintActions.jsx, deren 422-Parse-Logik in den Container-Views
// liegt und dort eigene Coverage hat). Es bleibt die LIVE-Coverage des
// Backend-Guards (Datengrundlage der blockierenden Issues).
describe('DD-360 — Block-Dialog rendert result-lose Issues', () => {
  test('Backend-Guard liefert key + title (Datengrundlage)', () => {
    expect(guard).toMatch(/b\.title/)
    expect(guard).toMatch(/project_prefix/)
    expect(guard).toMatch(/status IN \('done','passed'\)/)
  })
})
