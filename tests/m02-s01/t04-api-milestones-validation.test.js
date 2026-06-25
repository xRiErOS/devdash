import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject, seedMilestones } from '../_fixtures/seed.js'
import { applyMigration } from '../../server/lib/migrationRunner.js'
import {
  validateMilestonePayload,
  validateStatusFilter,
  resolveTargetDate,
  ValidationError,
} from '../../server/lib/milestoneValidation.js'

const MIG_029 = '029_v3_milestone_target_date_required.sql'

describe('T04 — Milestone-Validation (pure functions)', () => {
  describe('validateMilestonePayload create', () => {
    test('Erfolg bei Name + target_date', () => {
      expect(() => validateMilestonePayload({ name: 'M-X', target_date: '2026-12-31' }, { operation: 'create' })).not.toThrow()
    })

    test('400 bei fehlendem name', () => {
      try {
        validateMilestonePayload({ target_date: '2026-12-31' }, { operation: 'create' })
        expect.fail('should have thrown')
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError)
        expect(e.statusCode).toBe(400)
        expect(e.field).toBe('name')
      }
    })

    test('Finding #2: target_date OPTIONAL bei create — API füllt Default', () => {
      // Nach Finding #2 ist target_date kein 422 mehr — validateMilestonePayload akzeptiert,
      // api.js POST nutzt resolveTargetDate als Fallback.
      expect(() => validateMilestonePayload({ name: 'M-X' }, { operation: 'create' })).not.toThrow()
      expect(() => validateMilestonePayload({ name: 'M-X', target_date: '' }, { operation: 'create' })).not.toThrow()
      expect(() => validateMilestonePayload({ name: 'M-X', target_date: '   ' }, { operation: 'create' })).not.toThrow()
    })

    test('Finding #5: name=0 (Number) wird mit 400 abgelehnt', () => {
      try {
        validateMilestonePayload({ name: 0 }, { operation: 'create' })
        expect.fail('should throw')
      } catch (e) {
        expect(e.statusCode).toBe(400)
        expect(e.field).toBe('name')
      }
    })

    test('Finding #5: name=false wird mit 400 abgelehnt', () => {
      try {
        validateMilestonePayload({ name: false }, { operation: 'create' })
        expect.fail('should throw')
      } catch (e) {
        expect(e.statusCode).toBe(400)
        expect(e.field).toBe('name')
      }
    })
  })

  describe('validateMilestonePayload update', () => {
    test('Erfolg bei leerem Body', () => {
      expect(() => validateMilestonePayload({}, { operation: 'update' })).not.toThrow()
    })

    test('Erfolg wenn target_date NICHT im Body (kein Update darauf)', () => {
      expect(() => validateMilestonePayload({ description: 'updated' }, { operation: 'update' })).not.toThrow()
    })

    test('Finding #3: target_date=\'\' bei update wird akzeptiert (API auto-defaults via resolveTargetDate)', () => {
      expect(() => validateMilestonePayload({ target_date: '' }, { operation: 'update' })).not.toThrow()
    })

    test('Finding #3: target_date=null bei update wird akzeptiert', () => {
      expect(() => validateMilestonePayload({ target_date: null }, { operation: 'update' })).not.toThrow()
    })

    test('400 wenn name auf leer gesetzt wird', () => {
      try {
        validateMilestonePayload({ name: '   ' }, { operation: 'update' })
        expect.fail('should have thrown')
      } catch (e) {
        expect(e.statusCode).toBe(400)
        expect(e.field).toBe('name')
      }
    })
  })

  describe('resolveTargetDate (Finding #2 + #3)', () => {
    test('explicit ISO-Datum wird durchgereicht', () => {
      expect(resolveTargetDate('2026-12-31')).toBe('2026-12-31')
    })

    test('leerer String → Default = now + 90 days', () => {
      const result = resolveTargetDate('')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      const expected = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      expect(result).toBe(expected)
    })

    test('null → Default = createdAt + 90 days wenn gegeben', () => {
      const createdAt = '2026-01-01T00:00:00Z'
      const expected = new Date(new Date(createdAt).getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      expect(resolveTargetDate(null, { createdAt })).toBe(expected)
    })

    test('undefined fällt auf now-Basis zurück wenn createdAt fehlt', () => {
      const result = resolveTargetDate(undefined)
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    test('Whitespace-String wird auch defaulted', () => {
      const result = resolveTargetDate('   ')
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('validateStatusFilter', () => {
    test('Default = open bei fehlendem Param', () => {
      expect(validateStatusFilter(undefined)).toBe('open')
      expect(validateStatusFilter(null)).toBe('open')
      expect(validateStatusFilter('')).toBe('open')
    })

    test('open + all sind valid', () => {
      expect(validateStatusFilter('open')).toBe('open')
      expect(validateStatusFilter('all')).toBe('all')
    })

    test('400 bei invaliden Werten', () => {
      try {
        validateStatusFilter('foo')
        expect.fail('should have thrown')
      } catch (e) {
        expect(e.statusCode).toBe(400)
        expect(e.field).toBe('status')
      }
    })
  })
})

describe('T04 — GET /api/milestones Filter-Logic (DB-Level)', () => {
  let db
  let logDir

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    logDir = mkdtempSync(join(tmpdir(), 'devd-m04-'))
    applyMigration(db, MIG_029, { logDir })

    seedMilestones(db, [
      { name: 'M-open-1', target_date: '2026-06-01', status: 'open' },
      { name: 'M-open-2', target_date: '2026-07-01', status: 'open' },
      { name: 'M-reached', target_date: '2026-05-01', status: 'reached' },
      { name: 'M-cancelled', target_date: '2026-04-01', status: 'cancelled' },
    ])
  })

  afterEach(() => {
    db.close()
    rmSync(logDir, { recursive: true, force: true })
  })

  test('SELECT mit status=open Filter liefert nur open (2 Rows)', () => {
    const rows = db.prepare(`
      SELECT name, status FROM milestones
      WHERE project_id = ? AND status = 'open'
      ORDER BY position ASC
    `).all(2)
    expect(rows.map(r => r.name)).toEqual(['M-open-1', 'M-open-2'])
  })

  test('SELECT ohne Filter (all) liefert alle 4 Rows', () => {
    const rows = db.prepare(`
      SELECT name, status FROM milestones
      WHERE project_id = ?
      ORDER BY position ASC
    `).all(2)
    expect(rows).toHaveLength(4)
    expect(rows.map(r => r.status).sort()).toEqual(['cancelled', 'open', 'open', 'reached'])
  })
})
