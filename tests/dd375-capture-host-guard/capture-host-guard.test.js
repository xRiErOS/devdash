// DD-375 / DD-392 / DD-462 — Capture-Host API-Allowlist guard.
//
// issues.familie-riedel.org is public (Cloudflare) and serves the capture PWA
// without Authelia. The guard scopes that host to the endpoints CaptureView calls;
// everything else under /api/* must be blocked. DD-392 adds the per-slug capture
// endpoint to the allowlist (the deep-link resolves a single project instead of
// pulling the full list). DD-462 (B02) REMOVES list-minimal from the public
// allowlist — it enumerated the public-capture project set to the internet; the
// public path is now deep-link only, the bare dropdown is owner-only.

import { describe, test, expect } from 'vitest'
import {
  shouldBlockOnCaptureHost,
  hostIsCaptureHost,
  CAPTURE_API_ALLOWLIST,
  DEFAULT_CAPTURE_HOST,
} from '../../apps/backend/src/lib/captureHostGuard.js'

const H = DEFAULT_CAPTURE_HOST // 'issues.familie-riedel.org'

describe('shouldBlockOnCaptureHost — capture host (issues.*)', () => {
  test('DD-462: blocks GET /api/projects/list-minimal (no public project enumeration)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/projects/list-minimal' })).toBe(true)
  })

  test('allows POST /api/issues (PWA capture)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'POST', path: '/api/issues' })).toBe(false)
  })

  test('allows GET /api/projects/by-slug/:slug/capture (DD-392 deep-link)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/projects/by-slug/spf/capture' })).toBe(false)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/projects/by-slug/dev-wiki/capture' })).toBe(false)
  })

  test('blocks by-slug with wrong method (only GET allowed)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'POST', path: '/api/projects/by-slug/spf/capture' })).toBe(true)
  })

  test('blocks by-slug near-miss paths (no /capture suffix, extra segment, nested slug)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/projects/by-slug/spf' })).toBe(true)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/projects/by-slug/spf/capture/x' })).toBe(true)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/projects/by-slug/a/b/capture' })).toBe(true)
  })

  test('blocks GET /api/backlog (data exfil)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/backlog' })).toBe(true)
  })

  test('blocks DELETE /api/projects/2 (mutation)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'DELETE', path: '/api/projects/2' })).toBe(true)
  })

  test('blocks GET /api/issues — only POST is allowed on that path', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/issues' })).toBe(true)
  })

  test('blocks POST /api/projects/list-minimal (not allowlisted at all)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'POST', path: '/api/projects/list-minimal' })).toBe(true)
  })

  test('blocks a near-miss path prefix (no substring escape)', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'POST', path: '/api/issues/9999/delete' })).toBe(true)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/projects/list-minimal-secrets' })).toBe(true)
  })

  test('host match is case-insensitive and port-tolerant', () => {
    expect(shouldBlockOnCaptureHost({ host: 'ISSUES.familie-riedel.org:443', method: 'GET', path: '/api/backlog' })).toBe(true)
    expect(shouldBlockOnCaptureHost({ host: 'ISSUES.familie-riedel.org', method: 'POST', path: '/api/issues' })).toBe(false)
  })

  test('OPTIONS preflight is never blocked', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'OPTIONS', path: '/api/backlog' })).toBe(false)
  })

  test('non-/api paths (PWA shell + assets) pass through', () => {
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/' })).toBe(false)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/assets/app.js' })).toBe(false)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/manifest.webmanifest' })).toBe(false)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/catch/spf' })).toBe(false)
  })
})

describe('shouldBlockOnCaptureHost — other hosts pass untouched', () => {
  test('devdash admin host never blocked (Authelia-protected separately)', () => {
    expect(shouldBlockOnCaptureHost({ host: 'devdash.familie-riedel.org', method: 'DELETE', path: '/api/projects/2' })).toBe(false)
    expect(shouldBlockOnCaptureHost({ host: 'devdash.familie-riedel.org', method: 'GET', path: '/api/backlog' })).toBe(false)
  })

  test('localhost (dev) never blocked', () => {
    expect(shouldBlockOnCaptureHost({ host: 'localhost', method: 'GET', path: '/api/backlog' })).toBe(false)
  })

  test('missing/empty host never blocked', () => {
    expect(shouldBlockOnCaptureHost({ host: '', method: 'GET', path: '/api/backlog' })).toBe(false)
    expect(shouldBlockOnCaptureHost({ host: undefined, method: 'GET', path: '/api/backlog' })).toBe(false)
  })

  test('custom captureHost override is honored', () => {
    expect(shouldBlockOnCaptureHost({ host: 'capture.example.com', method: 'GET', path: '/api/backlog', captureHost: 'capture.example.com' })).toBe(true)
    expect(shouldBlockOnCaptureHost({ host: H, method: 'GET', path: '/api/backlog', captureHost: 'capture.example.com' })).toBe(false)
  })
})

describe('hostIsCaptureHost helper', () => {
  test('matches the capture host case-insensitively, port-tolerant', () => {
    expect(hostIsCaptureHost('issues.familie-riedel.org')).toBe(true)
    expect(hostIsCaptureHost('ISSUES.familie-riedel.org:443')).toBe(true)
    expect(hostIsCaptureHost('devdash.familie-riedel.org')).toBe(false)
    expect(hostIsCaptureHost('localhost')).toBe(false)
    expect(hostIsCaptureHost('')).toBe(false)
    expect(hostIsCaptureHost(undefined)).toBe(false)
  })

  test('honors a custom captureHost', () => {
    expect(hostIsCaptureHost('capture.example.com', 'capture.example.com')).toBe(true)
    expect(hostIsCaptureHost('issues.familie-riedel.org', 'capture.example.com')).toBe(false)
  })
})

describe('allowlist shape', () => {
  test('DD-462: exactly the two public capture endpoints (by-slug, issues)', () => {
    expect(CAPTURE_API_ALLOWLIST).toHaveLength(2)
    expect(CAPTURE_API_ALLOWLIST[0].method).toBe('GET')
    expect(CAPTURE_API_ALLOWLIST[0].pattern).toBeInstanceOf(RegExp)
    expect(CAPTURE_API_ALLOWLIST[1]).toEqual({ method: 'POST', path: '/api/issues' })
  })

  test('DD-462: list-minimal is NOT in the public allowlist', () => {
    expect(CAPTURE_API_ALLOWLIST.some((r) => r.path === '/api/projects/list-minimal')).toBe(false)
  })
})
