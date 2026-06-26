// Frontend-Render-Smoke — das EINZIGE Frontend-Netz nach dem DD2-Clean-Cut (D05).
//
// Vertrag: Jede kuratierte Insel-Story (src/ui/**/*.stories.*) muss
// fehlerfrei zu nicht-leerem Markup rendern. Kein data-ui-Gate, kein Achsen-Gate,
// keine Drift-Kette — nur: "bricht eine Story beim Rendern?". Fängt tote Imports,
// kaputte composeStories und Render-Exceptions VOR dem Browser ab (deckt den
// Review-Slim-Pass ab: löschen/verschieben von Stories kann nicht still brechen).
//
// SSR-only wie der Rest der Suite (Node-Env, renderToStaticMarkup) — kein jsdom.
// composeStories ist component-only (kein setProjectAnnotations): Preview-Decorators
// (Theme/MSW) laufen NICHT mit; reiner Render-Smoke der Komponenten-Bäume.

import { describe, test, expect } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { composeStories } from '@storybook/react'

// Vite-Glob (eager): lädt jedes Story-Modul der Insel zur Build-Zeit ein.
const modules = import.meta.glob(
  '../../apps/frontend/src/ui/**/*.stories.{js,jsx}',
  { eager: true },
)

const entries = Object.entries(modules)

describe('Frontend-Render-Smoke — Insel-Stories', () => {
  test('mindestens eine Story-Datei gefunden (Glob nicht leergelaufen)', () => {
    expect(entries.length).toBeGreaterThan(0)
  })

  for (const [path, mod] of entries) {
    // Pfad ab src/ für lesbare Test-Namen.
    const i = path.indexOf('src/ui/')
    const rel = i >= 0 ? path.slice(i) : path

    describe(rel, () => {
      let composed = {}
      try {
        composed = composeStories(mod)
      } catch (err) {
        test('composeStories', () => {
          throw new Error(`composeStories warf für ${rel}: ${err.message}`)
        })
        return
      }

      const names = Object.keys(composed)
      if (names.length === 0) {
        test('hat exportierte Stories', () => {
          expect(names.length).toBeGreaterThan(0)
        })
        return
      }

      for (const name of names) {
        const Story = composed[name]
        test(`${name} rendert zu nicht-leerem Markup`, () => {
          const html = renderToStaticMarkup(<Story />)
          expect(typeof html).toBe('string')
          expect(html.length).toBeGreaterThan(0)
        })
      }
    })
  }
})
