// DD-352 — Page-Header Breadcrumb-Label-Resolver.
//
// PageHeader rendert einen konsistenten Header auf allen /:slug/<view>-Seiten
// (Slug-Breadcrumb + View-Label). Der View-Label-Resolver ist pure und wird
// hier gegen alle gemappten Views + Edge-Cases getestet (Konvention: pure
// Logik aus der Komponente extrahieren, vgl. sprintDetailHelpers.js).

import { describe, test, expect } from 'vitest'
import { VIEW_LABELS, resolveViewLabel } from '../../src/lib/pageHeaderLabel.js'

describe('DD-352 · resolveViewLabel', () => {
  test('löst das View-Segment hinter dem Slug auf', () => {
    expect(resolveViewLabel('/devd/backlog')).toBe('Backlog')
    expect(resolveViewLabel('/mybaby/milestones')).toBe('Milestones')
    expect(resolveViewLabel('/devd/settings')).toBe('Einstellungen')
  })

  test('Detail-Routen (mit :id) behalten das View-Label', () => {
    expect(resolveViewLabel('/devd/issues/42')).toBe('Issue')
    expect(resolveViewLabel('/devd/milestones/7')).toBe('Milestones')
    expect(resolveViewLabel('/devd/review/166')).toBe('Review')
  })

  test('jeder gemappte View liefert ein Label', () => {
    for (const [seg, label] of Object.entries(VIEW_LABELS)) {
      expect(resolveViewLabel(`/devd/${seg}`)).toBe(label)
    }
  })

  test('Slug-Index (kein View-Segment) → Project-Home-Default', () => {
    expect(resolveViewLabel('/devd')).toBe('Project Home')
  })

  test('unbekanntes View-Segment → Project-Home-Default', () => {
    expect(resolveViewLabel('/devd/voellig-unbekannt')).toBe('Project Home')
  })

  test('leerer/ungültiger Pfad fällt nicht um', () => {
    expect(resolveViewLabel('')).toBe('Project Home')
    expect(resolveViewLabel(null)).toBe('Project Home')
    expect(resolveViewLabel('/')).toBe('Project Home')
  })
})
