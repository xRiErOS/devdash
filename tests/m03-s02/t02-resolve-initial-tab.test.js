import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { resolveInitialTab, TAB_IDS, DEFAULT_TAB } from '../../src/hooks/useProjectHomeTab.js'

const PROJECT_ID = 2
const LS_KEY = `devd:home:lastTab:${PROJECT_ID}`

function mockWindow() {
  const store = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
  }
  return store
}

function clearWindow() {
  delete globalThis.window
}

describe('T02 — resolveInitialTab (URL > localStorage > default)', () => {
  let store
  beforeEach(() => { store = mockWindow() })
  afterEach(() => { clearWindow() })

  // DD-487 (T02): SOLL-Tab-Set — Todo/Settings entfernt, Memories aufgenommen.
  // DD-666: Backlog + Roadmap entfernt — SOLL-Tab-Set = overview/sstd/memory.
  test('URL ?tab=memory gewinnt vor localStorage', () => {
    store.set(LS_KEY, 'sstd')
    expect(resolveInitialTab(PROJECT_ID, '?tab=memory')).toBe('memory')
  })

  test('ohne URL: localStorage gewinnt', () => {
    store.set(LS_KEY, 'sstd')
    expect(resolveInitialTab(PROJECT_ID, '')).toBe('sstd')
  })

  test('weder URL noch localStorage: Default "overview"', () => {
    expect(resolveInitialTab(PROJECT_ID, '')).toBe(DEFAULT_TAB)
    expect(resolveInitialTab(PROJECT_ID, '?other=x')).toBe(DEFAULT_TAB)
  })

  test('Ungültiger URL-Wert wird abgelehnt, fällt auf localStorage zurück', () => {
    store.set(LS_KEY, 'sstd')
    expect(resolveInitialTab(PROJECT_ID, '?tab=evil')).toBe('sstd')
  })

  // DD-666: ein gespeichertes/URL backlog|roadmap ist KEIN gültiger Tab mehr →
  // graceful Fallback auf den Default (overview).
  test('DD-666: ?tab=backlog|roadmap ist nicht mehr gültig → Default overview', () => {
    expect(resolveInitialTab(PROJECT_ID, '?tab=backlog')).toBe(DEFAULT_TAB)
    expect(resolveInitialTab(PROJECT_ID, '?tab=roadmap')).toBe(DEFAULT_TAB)
  })

  test('DD-666: stale localStorage backlog|roadmap wird ignoriert → Default overview', () => {
    store.set(LS_KEY, 'backlog')
    expect(resolveInitialTab(PROJECT_ID, '')).toBe(DEFAULT_TAB)
    store.set(LS_KEY, 'roadmap')
    expect(resolveInitialTab(PROJECT_ID, '')).toBe(DEFAULT_TAB)
  })

  test('Ungültiger localStorage-Wert wird ignoriert, fällt auf Default zurück', () => {
    store.set(LS_KEY, 'evil')
    expect(resolveInitialTab(PROJECT_ID, '')).toBe(DEFAULT_TAB)
  })

  test('Alle Tab-IDs werden akzeptiert', () => {
    for (const id of TAB_IDS) {
      expect(resolveInitialTab(PROJECT_ID, `?tab=${id}`)).toBe(id)
    }
  })

  test('Search-String ohne führendes ? wird auch verarbeitet', () => {
    expect(resolveInitialTab(PROJECT_ID, 'tab=sstd')).toBe('sstd')
  })

  test('TAB_IDS enthält genau die 3 SOLL-Tabs in dieser Reihenfolge (DD-487/DD-666)', () => {
    expect(TAB_IDS).toEqual(['overview', 'sstd', 'memory'])
  })
})
