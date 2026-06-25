// DD-274 — hostname-detection unit tests for the memory feature flag.
//
// The helper is the gate that keeps the NAS deployment from calling /api/memories
// at all. We want lock-tight behaviour: NAS hostname → disabled, local dev hosts
// → enabled, override query → enabled even on NAS.

import { describe, it, expect } from 'vitest'
import {
  isMemoryFeatureAvailable,
  memoryUnavailableMessage,
  __testables,
} from '../../src/lib/memoryAvailability.js'

describe('isMemoryFeatureAvailable', () => {
  it('disables the feature on the NAS hostname', () => {
    expect(isMemoryFeatureAvailable('devdash.familie-riedel.org')).toBe(false)
  })

  it('is case-insensitive on hostname matching', () => {
    expect(isMemoryFeatureAvailable('DevDash.Familie-Riedel.ORG')).toBe(false)
  })

  it('keeps the feature available on localhost', () => {
    expect(isMemoryFeatureAvailable('localhost')).toBe(true)
  })

  it('keeps the feature available on 127.0.0.1', () => {
    expect(isMemoryFeatureAvailable('127.0.0.1')).toBe(true)
  })

  it('keeps the feature available on a Tailscale host', () => {
    expect(isMemoryFeatureAvailable('macmini.tailnet.ts.net')).toBe(true)
  })

  it('keeps the feature available for the empty string (SSR / unknown)', () => {
    expect(isMemoryFeatureAvailable('')).toBe(true)
  })

  it('keeps the feature available when hostname is undefined', () => {
    expect(isMemoryFeatureAvailable(undefined)).toBe(true)
  })

  it('re-enables the feature on a disabled host when memory=force is in the query', () => {
    expect(
      isMemoryFeatureAvailable('devdash.familie-riedel.org', '?memory=force'),
    ).toBe(true)
  })

  it('still respects the override when other query params are present', () => {
    expect(
      isMemoryFeatureAvailable(
        'devdash.familie-riedel.org',
        '?foo=bar&memory=force&baz=1',
      ),
    ).toBe(true)
  })

  it('does not re-enable for unrelated query strings', () => {
    expect(
      isMemoryFeatureAvailable('devdash.familie-riedel.org', '?other=1'),
    ).toBe(false)
  })

  it('does not enable for a partial hostname match', () => {
    // "devdash.familie-riedel.org.evil.com" must NOT be treated as the NAS.
    // Set membership is strict — this proves we are not using endsWith() by accident.
    expect(
      isMemoryFeatureAvailable('devdash.familie-riedel.org.evil.com'),
    ).toBe(true)
  })
})

describe('memoryUnavailableMessage', () => {
  it('mentions the hostname and the local-only constraint', () => {
    const msg = memoryUnavailableMessage('devdash.familie-riedel.org')
    expect(msg).toContain('devdash.familie-riedel.org')
    expect(msg.toLowerCase()).toContain('lokal')
  })
})

describe('__testables blocklist invariants', () => {
  it('lists the NAS hostname exactly', () => {
    expect(__testables.DISABLED_HOSTNAMES.has('devdash.familie-riedel.org')).toBe(true)
  })

  it('keeps the suffix list empty by default (false-positive guard)', () => {
    expect(__testables.DISABLED_HOSTNAME_SUFFIXES).toEqual([])
  })
})
