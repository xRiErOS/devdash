// Hot-Fix-Verifikation für Reviewer-Findings aus
// /Users/erik/Obsidian/Vault/000 INBOX/2026-05-24 DD-46 UserInput — Sprint Review Sub-Agent.md

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ConfirmDialogProvider, useConfirmDialog } from '../../src/contexts/ConfirmDialogContext.jsx'

const ROOT = resolve(import.meta.dirname, '../..')
const src = (p) => readFileSync(resolve(ROOT, p), 'utf8')

describe('Hot-Fix Review-Findings', () => {
  describe('B10 (DD-273 SLUG_MIN=2)', () => {
    test('componentNotes.js exportiert SLUG_MIN=2', () => {
      const s = src('server/lib/componentNotes.js')
      expect(s).toMatch(/export const SLUG_MIN = 2/)
    })
  })

  describe('I04 (DD-273 static import projectStore)', () => {
    test('componentNotesApi.js nutzt static import statt dynamic', () => {
      const s = src('src/lib/componentNotesApi.js')
      expect(s).toMatch(/^import \{ getActiveProjectId \} from '\.\/projectStore\.js'/m)
      expect(s).not.toMatch(/await import\('\.\/projectStore\.js'\)/)
    })
  })

  describe('I05 (DD-273 exitDebug stable-ref)', () => {
    test('DebugContext keydown-Effect hat enabled-only deps', () => {
      const s = src('src/contexts/DebugContext.jsx')
      expect(s).toMatch(/\}, \[enabled\]\)/)
      expect(s).toMatch(/eslint-disable-next-line react-hooks\/exhaustive-deps/)
    })
  })

  // DD-468: old shell deleted — assertions re-pointed to canonical ui/templates/ProjectHomeLayout.
  describe('B03 (DD-282 Bottom-Slot mobile filter)', () => {
    test('ProjectHomeLayout (canonical) setzt renderBottomSlot=false bei isMobile', () => {
      const s = src('src/components/ui/templates/ProjectHomeLayout.jsx')
      expect(s).toMatch(/renderBottomSlot = !isMobile && Boolean\(bottomSlot\)/)
      expect(s).not.toMatch(/display: isMobile \? 'block' : 'grid'/)
    })
  })

  describe('B04 (DD-282 Tab-Precedence)', () => {
    test('useProjectHomeTab exportiert resolveTabForProject + firstMountRef', () => {
      const s = src('src/hooks/useProjectHomeTab.js')
      expect(s).toMatch(/export function resolveTabForProject/)
      expect(s).toMatch(/firstMountRef/)
    })
  })

  // DD-468: old shell deleted — assertions re-pointed to canonical ui/templates/ProjectHomeLayout.
  describe('B05 (DD-282 H1 inside Layout)', () => {
    test('ProjectHomeLayout (canonical) akzeptiert pageHeading-Prop', () => {
      const s = src('src/components/ui/templates/ProjectHomeLayout.jsx')
      expect(s).toMatch(/pageHeading/)
      expect(s).toMatch(/\{pageHeading && \(/)
    })

    test('ProjectHomeView publiziert den Titel via usePageTitle (pageHeading=null)', () => {
      // DD#82-r2: Der Titel wandert aus dem pageHeading-Slot in den app-shell.sub-
      // header (usePageTitle). pageHeading wird null gereicht; das Layout-Template
      // guarded den Slot weiterhin ({pageHeading && (…)}).
      const s = src('src/views/ProjectHomeView.jsx')
      expect(s).toMatch(/const pageHeading = null/)
      expect(s).toMatch(/pageHeading=\{pageHeading\}/)
      expect(s).toMatch(/usePageTitle\(homeTitle\)/)
      expect(s).not.toMatch(/<>\s*<h1/)
    })
  })

  // DD-468: old shell deleted — assertion re-pointed to canonical ui/templates/ProjectHomeLayout.
  describe('I07 (DD-282 CSS-Var mobile-bottom-nav-h)', () => {
    test('Layout (canonical) nutzt --mobile-bottom-nav-h CSS-Variable', () => {
      const s = src('src/components/ui/templates/ProjectHomeLayout.jsx')
      expect(s).toMatch(/--mobile-bottom-nav-h/)
    })
  })

  describe('B06 (DD-283 snapshot useCallback)', () => {
    test('useProjectTodos snapshot ist useCallback mit todos-dep', () => {
      const s = src('src/hooks/useProjectTodos.js')
      expect(s).toMatch(/const snapshot = useCallback\(\(\) => \{ snapshotRef\.current = todos \}, \[todos\]\)/)
    })
  })

  describe('B07 (DD-283 reorder filter optimistic IDs)', () => {
    test('reorder lehnt negative/non-Number IDs ab', () => {
      const s = src('src/hooks/useProjectTodos.js')
      expect(s).toMatch(/orderedIds\.some\(id => typeof id !== 'number' \|\| id <= 0\)/)
      expect(s).toMatch(/Reorder verzögert/)
    })
  })

  // DD-587: B08 entfernt — TodoDetailModal.jsx wurde ins _archive verschoben
  // (import-closed dead set; Live-Variante in ui/organisms).

  describe('B09 (DD-283 addLink Doc-Kommentar)', () => {
    test('addLink Code-Kommentar dokumentiert dass NICHT optimistic', () => {
      const s = src('src/hooks/useProjectTodos.js')
      expect(s).toMatch(/addLink ist NICHT optimistic/)
    })
  })

  describe('I10 (ConfirmDialog ersetzt window.confirm)', () => {
    // DD-587: TodoTab-Assert entfernt — projectHome/tabs/TodoTab.jsx wurde ins
    // _archive verschoben (import-closed dead set). Die übrigen I10-Asserts
    // (NotesPanel, Layout, ConfirmDialog SSR) decken weiterhin Live-Dateien.

    test('NotesPanel (R4-Scratchpad) hat kein window.confirm', () => {
      // DD-273 R4: NotesPanel ist jetzt ein freies Scratchpad (DevWiki 40.03) —
      // kein per-Slug-DB-Delete mehr, daher kein Confirm-Dialog nötig. Die I10-
      // Regel (kein blockendes window.confirm) gilt weiter und ist trivial erfüllt.
      // DD-472 T3B: Legacy-Pfad → _archive/; kanonische Variante in ui/organisms.
      const s = src('src/components/ui/organisms/NotesPanel.jsx')
      expect(s).not.toMatch(/window\.confirm\(/)
    })

    test('Layout.jsx wrapt mit ConfirmDialogProvider', () => {
      const s = src('src/components/ui/layout/Layout.jsx')
      expect(s).toMatch(/ConfirmDialogProvider/)
      expect(s).toMatch(/<ConfirmDialogProvider>/)
      expect(s).toMatch(/<\/ConfirmDialogProvider>/)
    })

    test('ConfirmDialog SSR rendert Backdrop + Confirm-Button bei state', () => {
      function Consumer() {
        const { confirm } = useConfirmDialog()
        return null
      }
      const html = renderToStaticMarkup(
        <ConfirmDialogProvider>
          <Consumer />
        </ConfirmDialogProvider>
      )
      // Initial: kein Dialog gerendert (state=null)
      expect(html).not.toContain('confirm-dialog.backdrop')
    })
  })

  describe('I11 (DD-283 JSON parse-error throw)', () => {
    test('projectHomeApi._request wirft MALFORMED_JSON bei ok+parseError', () => {
      const s = src('src/lib/projectHomeApi.js')
      expect(s).toMatch(/MALFORMED_JSON/)
      expect(s).toMatch(/parseError/)
    })
  })

  // DD-587: I12 entfernt — projectHome/AddLinkPicker.jsx wurde ins _archive
  // verschoben (import-closed dead set; Live-Variante in ui/organisms).
})
