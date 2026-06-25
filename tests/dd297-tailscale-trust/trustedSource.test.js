import { describe, test, expect } from 'vitest'
import { isTrustedSource } from '../../apps/backend/src/lib/trustedSource.js'

describe('DD-297 · isTrustedSource — RFC1918 + Loopback', () => {
  test('Loopback IPv4 trusted', () => {
    expect(isTrustedSource('127.0.0.1')).toBe(true)
    expect(isTrustedSource('::ffff:127.0.0.1')).toBe(true)
  })
  test('Loopback IPv6 trusted', () => {
    expect(isTrustedSource('::1')).toBe(true)
  })
  test('Private IPv4 trusted', () => {
    expect(isTrustedSource('10.0.0.1')).toBe(true)
    expect(isTrustedSource('10.255.255.254')).toBe(true)
    expect(isTrustedSource('172.16.0.1')).toBe(true)
    expect(isTrustedSource('172.31.255.254')).toBe(true)
    expect(isTrustedSource('192.168.1.10')).toBe(true)
  })
  test('Mapped IPv4 trusted', () => {
    expect(isTrustedSource('::ffff:10.0.0.1')).toBe(true)
    expect(isTrustedSource('::ffff:192.168.1.1')).toBe(true)
    expect(isTrustedSource('::ffff:172.20.1.1')).toBe(true)
  })
  test('IPv6 ULA + link-local trusted', () => {
    expect(isTrustedSource('fc00::1')).toBe(true)
    expect(isTrustedSource('fd12:3456:789a::1')).toBe(true)
    expect(isTrustedSource('fe80::1')).toBe(true)
  })
})

describe('DD-297 · Tailscale CGNAT (100.64.0.0/10) trusted', () => {
  test('NAS-Tailscale-IP wird als trusted erkannt', () => {
    expect(isTrustedSource('100.71.39.53')).toBe(true)
  })
  test('Tailscale CGNAT Range-Grenzen', () => {
    expect(isTrustedSource('100.64.0.0')).toBe(true)
    expect(isTrustedSource('100.64.0.1')).toBe(true)
    expect(isTrustedSource('100.99.99.99')).toBe(true)
    expect(isTrustedSource('100.127.255.255')).toBe(true)
  })
  test('Tailscale-Range Edge-Cases', () => {
    expect(isTrustedSource('100.65.1.1')).toBe(true)
    expect(isTrustedSource('100.79.255.1')).toBe(true)
    expect(isTrustedSource('100.100.0.1')).toBe(true)
    expect(isTrustedSource('100.119.0.1')).toBe(true)
  })
  test('Mapped Tailscale-IPv6 trusted', () => {
    expect(isTrustedSource('::ffff:100.71.39.53')).toBe(true)
  })
})

describe('DD-297 · Untrusted public IPs nicht falsch-positiv', () => {
  test('100.x ausserhalb CGNAT nicht trusted', () => {
    expect(isTrustedSource('100.0.0.1')).toBe(false)
    expect(isTrustedSource('100.63.255.255')).toBe(false)
    expect(isTrustedSource('100.128.0.0')).toBe(false)
    expect(isTrustedSource('100.255.0.1')).toBe(false)
  })
  test('Public IPv4 nicht trusted', () => {
    expect(isTrustedSource('8.8.8.8')).toBe(false)
    expect(isTrustedSource('1.1.1.1')).toBe(false)
    expect(isTrustedSource('203.0.113.1')).toBe(false)
    expect(isTrustedSource('172.32.0.1')).toBe(false)
    expect(isTrustedSource('172.15.0.1')).toBe(false)
    expect(isTrustedSource('11.0.0.1')).toBe(false)
    expect(isTrustedSource('100.50.0.1')).toBe(false)
  })
  test('Bogus / empty Input nicht trusted', () => {
    expect(isTrustedSource('')).toBe(false)
    expect(isTrustedSource(null)).toBe(false)
    expect(isTrustedSource(undefined)).toBe(false)
    expect(isTrustedSource('not-an-ip')).toBe(false)
  })
})
