// DD-462 — MilestoneForm-Extract Characterisierungs-/Parity-Test.
//
// Phase 1 (vor Extraktion): verifiziert Ist-Verhalten von MilestoneForm
// in MilestoneView.jsx via Source-Asserts + renderToStaticMarkup.
//
// Phase 2 (nach Extraktion): dieselben Asserts laufen gegen
// src/components/milestone/MilestoneForm.jsx — kein Logik-Verlust (E01-Gate).
//
// Phase 3 (DD-588 Cutover): kanonisches ui/-Organism ist der neue Target —
// src/components/ui/organisms/MilestoneForm.jsx. Container-Logik (fetch/POST/PUT/PATCH)
// ist nach MilestoneDetail.jsx gehoben; das Organism ist presentational.
//
// Test-Stack: Vitest + Node-Environment (kein jsdom),
// renderToStaticMarkup für JSX-Render-Checks (analog dd309, dd293-r2).

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..', '..')

function readSource(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8')
}

// -- Source-Assertions ---------------------------------------------------------

describe('DD-462 · MilestoneForm Source-Assertions', () => {
  // DD-588 Cutover: kanonisches ui/-Organism ist der neue Target.
  test('src/components/ui/organisms/MilestoneForm.jsx existiert', () => {
    const p = path.join(REPO_ROOT, 'src/components/ui/organisms/MilestoneForm.jsx')
    expect(fs.existsSync(p), 'MilestoneForm.jsx fehlt im kanonischen ui/-Pfad').toBe(true)
  })

  test('MilestoneForm ist als default export aus dem Organism exportiert', () => {
    const src = readSource('src/components/ui/organisms/MilestoneForm.jsx')
    expect(src).toMatch(/export\s+default\s+function\s+MilestoneForm/)
  })

  test('MilestoneView.jsx existiert nicht mehr (455c-Delete)', () => {
    const p = path.join(REPO_ROOT, 'src/views/MilestoneView.jsx')
    expect(fs.existsSync(p), 'MilestoneView.jsx sollte gelöscht sein').toBe(false)
  })

  test('MilestoneDetail.jsx importiert MilestoneForm aus dem kanonischen ui/-Modul', () => {
    const src = readSource('src/views/MilestoneDetail.jsx')
    expect(src).toMatch(
      /import\s+MilestoneForm\s+from\s+['"].*components\/ui\/organisms\/MilestoneForm/
    )
  })

  test('MilestoneForm-Definition existiert NUR im ui/-Modul (kein Re-Define in Consumern)', () => {
    const detail = readSource('src/views/MilestoneDetail.jsx')
    expect(detail).not.toMatch(/export\s+(default\s+)?function\s+MilestoneForm/)
    expect(detail).not.toMatch(/^\s*function\s+MilestoneForm\b/m)
    // Genau eine Definition im Organism selbst.
    const formModule = readSource('src/components/ui/organisms/MilestoneForm.jsx')
    expect(formModule).toMatch(/export\s+default\s+function\s+MilestoneForm/)
  })

  // DD-588: Presentational-Signatur — milestone/onSubmit/onCancel/chrome/saving/error.
  test('MilestoneForm-Signatur enthält milestone, onSubmit, onCancel, chrome', () => {
    const src = readSource('src/components/ui/organisms/MilestoneForm.jsx')
    expect(src).toMatch(/milestone\s*=\s*null/)
    expect(src).toMatch(/onSubmit/)
    expect(src).toMatch(/onCancel/)
    expect(src).toMatch(/chrome\s*=\s*['"]modal['"]/)
  })

  // DD-588: Container-Logik (POST/PUT/PATCH) ist nach MilestoneDetail gehoben.
  test('Submit-Logik: POST /api/milestones fuer Create in MilestoneDetail vorhanden', () => {
    const src = readSource('src/views/MilestoneDetail.jsx')
    expect(src).toMatch(/['"]POST['"]/)
    expect(src).toMatch(/['"]\/api\/milestones['"]/)
  })

  test('Submit-Logik: PUT fuer Edit in MilestoneDetail vorhanden', () => {
    const src = readSource('src/views/MilestoneDetail.jsx')
    expect(src).toMatch(/['"]PUT['"]/)
  })

  test('Submit-Logik: PATCH fuer deferred-Toggle in MilestoneDetail vorhanden', () => {
    const src = readSource('src/views/MilestoneDetail.jsx')
    expect(src).toMatch(/['"]PATCH['"]/)
    expect(src).toMatch(/deferred/)
  })

  test('chrome=modal-Zweig im Organism vorhanden', () => {
    const src = readSource('src/components/ui/organisms/MilestoneForm.jsx')
    expect(src).toMatch(/chrome\s*===\s*['"]modal['"]/)
  })

  test('data-ui milestone-form.name im Organism vorhanden (kanonischer Scope-Präfix)', () => {
    // DD-588: ui/-Organism verwendet dataUiScope-Präfix (default 'milestone-form'),
    // daher 'milestone-form.name' statt legacy-Literal 'milestones.form.name'.
    const src = readSource('src/components/ui/organisms/MilestoneForm.jsx')
    expect(src).toMatch(/`\$\{dataUiScope\}\.name`/)
  })

  test('Defer-Toggle (data-testid milestone-form-defer-toggle) im Organism vorhanden', () => {
    const src = readSource('src/components/ui/organisms/MilestoneForm.jsx')
    expect(src).toMatch(/milestone-form-defer-toggle/)
  })
})

// -- MilestoneCreateModal Source-Assertions ------------------------------------
// DD-587: entfernt — src/components/milestone/MilestoneCreateModal.jsx wurde ins
// _archive verschoben (import-closed dead set; Live-Variante ist
// ui/organisms/MilestoneCreateModal.jsx mit eigener Story-/Test-Coverage).
// Die MilestoneForm-Parity-Garantie (oben) bleibt vollständig erhalten.

// -- Render-Tests --------------------------------------------------------------

describe('DD-462 · MilestoneForm Render-Parity (renderToStaticMarkup)', () => {
  let MilestoneFormModule

  // Dynamischer Import — läuft nach den Source-Assertions, damit der Dateipfad
  // bereits verifiziert ist. Wir fangen den Import-Fehler ab, damit der Test
  // eine klare Fehlermeldung liefert.
  test('MilestoneForm Create-Modus rendert Pflichtfeld Name + Submit-Button', async () => {
    try {
      MilestoneFormModule = await import(
        path.join(REPO_ROOT, 'src/components/ui/organisms/MilestoneForm.jsx')
      )
    } catch (e) {
      throw new Error(`Konnte MilestoneForm.jsx nicht importieren: ${e.message}`)
    }
    // DD-588: canonical MilestoneForm is default export
    const MilestoneForm = MilestoneFormModule.default ?? MilestoneFormModule.MilestoneForm
    expect(typeof MilestoneForm).toBe('function')

    // chrome='page' rendert den body direkt (kein Portal/Modal-Wrapper)
    // renderToStaticMarkup funktioniert nur mit synchronem Rendering —
    // wir nutzen chrome='page' (Inline-Fallback) um den body zu bekommen.
    const html = renderToStaticMarkup(
      React.createElement(MilestoneForm, {
        milestone: null,
        onSubmit: () => {},
        onCancel: () => {},
        chrome: 'page',
      })
    )
    // DD-588: canonical anchor is 'milestone-form.name' (dataUiScope-Präfix).
    expect(html).toMatch(/milestone-form\.name/)
    expect(html).toMatch(/Erstellen/)
    expect(html).toMatch(/Neuen Milestone anlegen/)
  })

  test('MilestoneForm Edit-Modus rendert Defer-Toggle + Speichern-Button', async () => {
    if (!MilestoneFormModule) {
      MilestoneFormModule = await import(
        path.join(REPO_ROOT, 'src/components/ui/organisms/MilestoneForm.jsx')
      )
    }
    const MilestoneForm = MilestoneFormModule.default ?? MilestoneFormModule.MilestoneForm
    const html = renderToStaticMarkup(
      React.createElement(MilestoneForm, {
        milestone: { id: 42, name: 'Test-Milestone', description: '', target_date: null, deferred: false },
        onSubmit: () => {},
        onCancel: () => {},
        chrome: 'page',
      })
    )
    expect(html).toMatch(/Milestone bearbeiten/)
    expect(html).toMatch(/milestone-form-defer-toggle/)
    expect(html).toMatch(/Speichern/)
    expect(html).toMatch(/Test-Milestone/)
  })
})
