import { describe, test, expect } from 'vitest'
import {
  resolveView,
  VIEW_APP_SHELL,
  VIEW_CAPTURE,
  VIEW_CAPTURE_PINNED,
  VIEW_UNKNOWN,
} from '../../apps/frontend/src/lib/hostnameRouter.js'

describe('DD-269 — /catch/<slug> Deeplink', () => {
  test('issues.* + /catch/devd → VIEW_CAPTURE_PINNED, slug=devd', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/devd')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('devd')
    expect(r.source).toBe('deeplink-catch-slug')
  })

  test('issues.* + /catch/mybaby → VIEW_CAPTURE_PINNED, slug=mybaby', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/mybaby')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('mybaby')
  })

  test('issues.* + trailing slash /catch/devd/ → matched', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/devd/')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('devd')
  })

  test('uppercase slug normalized to lowercase', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/DevD')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('devd')
  })

  test('issues.* + / (root) → unchanged VIEW_CAPTURE (no pinning)', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.slug).toBeUndefined()
  })

  test('issues.* without pathname → VIEW_CAPTURE (BC)', () => {
    const r = resolveView('issues.familie-riedel.org')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  // DD-456: /catch deep-link now resolves on ANY known host. On trusted hosts
  // (devdash.* behind Authelia, localhost, tailnet) the backend resolves ALL
  // projects; on issues.* only public_capture=1. Frontend routing is identical —
  // exposure is enforced server-side (by-slug host filter).
  test('devdash.* + /catch/devd → VIEW_CAPTURE_PINNED (trusted host, backend resolves all)', () => {
    const r = resolveView('devdash.familie-riedel.org', '', '/catch/devd')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('devd')
    expect(r.source).toBe('deeplink-catch-slug')
  })

  test('localhost + /catch/devd → VIEW_CAPTURE_PINNED (known host)', () => {
    const r = resolveView('localhost', '', '/catch/devd')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('devd')
  })

  test('tailnet IP + /catch/devd → VIEW_CAPTURE_PINNED (pattern host)', () => {
    const r = resolveView('100.71.39.53', '', '/catch/devd')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('devd')
  })

  test('?capture=1 query-override has priority over /catch path', () => {
    const r = resolveView('devdash.familie-riedel.org', '?capture=1', '/catch/devd')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('query-override')
  })

  test('invalid pathname /catch/ (empty slug) → VIEW_CAPTURE (no match)', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('invalid pathname /catch (no trailing) → VIEW_CAPTURE (no match)', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('slug with hyphen accepted (e.g. /catch/home-lab)', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/home-lab')
    expect(r.view).toBe(VIEW_CAPTURE_PINNED)
    expect(r.slug).toBe('home-lab')
  })

  test('slug with underscore rejected (regex excludes _)', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/catch/bad_slug')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('unknown host + /catch/devd → VIEW_UNKNOWN (no pinning)', () => {
    const r = resolveView('weird.example.com', '', '/catch/devd')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('BC: resolveView(hostname) with single arg still works', () => {
    const r = resolveView('devdash.familie-riedel.org')
    expect(r.view).toBe(VIEW_APP_SHELL)
  })
})

describe('DD-456 — /capture path (full-access capture on trusted hosts)', () => {
  test('devdash.* + /capture → VIEW_CAPTURE (bare, full project list via backend)', () => {
    const r = resolveView('devdash.familie-riedel.org', '', '/capture')
    expect(r.view).toBe(VIEW_CAPTURE)
    expect(r.source).toBe('path-capture')
    expect(r.slug).toBeUndefined()
  })

  test('devdash.* + /capture/ (trailing slash) → VIEW_CAPTURE', () => {
    const r = resolveView('devdash.familie-riedel.org', '', '/capture/')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('localhost + /capture → VIEW_CAPTURE', () => {
    const r = resolveView('localhost', '', '/capture')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('tailnet IP + /capture → VIEW_CAPTURE (pattern host)', () => {
    const r = resolveView('100.71.39.53', '', '/capture')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('issues.* + /capture → VIEW_CAPTURE (known host; backend still public-only)', () => {
    const r = resolveView('issues.familie-riedel.org', '', '/capture')
    expect(r.view).toBe(VIEW_CAPTURE)
  })

  test('unknown host + /capture → VIEW_UNKNOWN (no capture on unknown hosts)', () => {
    const r = resolveView('weird.example.com', '', '/capture')
    expect(r.view).toBe(VIEW_UNKNOWN)
  })

  test('?capture=1 query-override still wins over /capture path', () => {
    const r = resolveView('devdash.familie-riedel.org', '?capture=1', '/capture')
    expect(r.source).toBe('query-override')
  })

  test('devdash.* + / (root) unchanged → VIEW_APP_SHELL', () => {
    const r = resolveView('devdash.familie-riedel.org', '', '/')
    expect(r.view).toBe(VIEW_APP_SHELL)
  })

  test('/capturexyz (no exact match) → does NOT trigger capture', () => {
    const r = resolveView('devdash.familie-riedel.org', '', '/capturexyz')
    expect(r.view).toBe(VIEW_APP_SHELL)
  })
})
