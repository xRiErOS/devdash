import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { SIDEBAR_LS_PREFIX } from '../../src/hooks/useSidebarCollapsed.js'
import { TAB_LS_PREFIX } from '../../src/hooks/useProjectHomeTab.js'

describe('T02 — Sidebar/Tab localStorage-Konvention', () => {
  test('Sidebar-LS-Key-Format pro Projekt', () => {
    expect(SIDEBAR_LS_PREFIX).toBe('devd:home:sidebar:')
    expect(`${SIDEBAR_LS_PREFIX}2`).toBe('devd:home:sidebar:2')
  })

  test('Tab-LS-Key-Format pro Projekt', () => {
    expect(TAB_LS_PREFIX).toBe('devd:home:lastTab:')
    expect(`${TAB_LS_PREFIX}2`).toBe('devd:home:lastTab:2')
  })
})
