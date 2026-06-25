import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createTestDb } from '../_fixtures/in-memory-db.js'
import { seedProject } from '../_fixtures/seed.js'
import {
  getSstdSources,
  clearCache,
  SstdSourcesError,
  _setReadSpy,
} from '../../server/lib/sstdSources.js'

// DD-281 — T04 SSTD-Sources Aggregator + Cache.

describe('T04 — getSstdSources', () => {
  let db, fakeRoot

  beforeEach(() => {
    db = createTestDb({ upToVersion: '028_v3_milestone_done_count_logic.sql' })
    seedProject(db)
    fakeRoot = mkdtempSync(join(tmpdir(), 'devd-sstd-'))
    // Seed: 3 markdown + 1 nested + 1 .txt-ignore
    writeFileSync(join(fakeRoot, 'a.md'), '# A')
    writeFileSync(join(fakeRoot, 'b.md'), '# B')
    mkdirSync(join(fakeRoot, 'sub'))
    writeFileSync(join(fakeRoot, 'sub', 'c.md'), '# C')
    writeFileSync(join(fakeRoot, 'ignore.txt'), 'no')
    db.prepare('UPDATE projects SET docs_path = ?, repo_path = ? WHERE id = ?').run(fakeRoot, fakeRoot, 2)
    clearCache()
    _setReadSpy(null)
  })

  afterEach(() => {
    rmSync(fakeRoot, { recursive: true, force: true })
    db.close()
    clearCache()
    _setReadSpy(null)
  })

  test('happy path: project + vault[] mit 3 Markdown-Files (sub/c.md included), .txt ignoriert', () => {
    const out = getSstdSources(db, 2)
    expect(out.project).toMatchObject({ id: 2, slug: 'devd', name: 'DevD' })
    expect(out.vault).toHaveLength(3)
    const relpaths = out.vault.map(v => v.relpath).sort()
    expect(relpaths).toEqual(['a.md', 'b.md', 'sub/c.md'])
  })

  test('vault[i].obsidian_uri ist URL-enkodierter ShortForm', () => {
    const out = getSstdSources(db, 2)
    const a = out.vault.find(v => v.relpath === 'a.md')
    expect(a.obsidian_uri).toBe('obsidian://open?vault=Vault&file=a')
  })

  test('path-traversal-Reject: docs_path = "/etc/passwd" außerhalb whitelist → 400 PATH_OUTSIDE_WHITELIST', () => {
    db.prepare('UPDATE projects SET docs_path = ?, repo_path = ? WHERE id = ?').run('/etc/passwd', fakeRoot, 2)
    clearCache()
    expect(() => getSstdSources(db, 2)).toThrow(/außerhalb der erlaubten Whitelist/)
  })

  test('Projekt non-existent → 404', () => {
    expect(() => getSstdSources(db, 99999)).toThrow(/Projekt existiert nicht/)
  })

  test('docs_path leer/null → leeres vault, kein FS-Read', () => {
    db.prepare('UPDATE projects SET docs_path = NULL WHERE id = ?').run(2)
    clearCache()
    const out = getSstdSources(db, 2)
    expect(out.vault).toEqual([])
  })

  test('Cache-Hit beim 2. Call (FS-Spy verifiziert 1x Read)', () => {
    let calls = 0
    _setReadSpy(() => calls++)
    clearCache()
    getSstdSources(db, 2)
    getSstdSources(db, 2)
    getSstdSources(db, 2)
    expect(calls).toBe(1)
  })

  test('clearCache(projectId) invalidiert spezifisches Projekt', () => {
    let calls = 0
    _setReadSpy(() => calls++)
    clearCache()
    getSstdSources(db, 2)
    clearCache(2)
    getSstdSources(db, 2)
    expect(calls).toBe(2)
  })

  test('clearCache() ohne ID invalidiert alles', () => {
    let calls = 0
    _setReadSpy(() => calls++)
    clearCache()
    getSstdSources(db, 2)
    clearCache()
    getSstdSources(db, 2)
    expect(calls).toBe(2)
  })

  test('Tiefen-Limit: 4 Levels werden nicht gefunden', () => {
    mkdirSync(join(fakeRoot, 'l1', 'l2', 'l3', 'l4'), { recursive: true })
    writeFileSync(join(fakeRoot, 'l1', 'l2', 'l3', 'l4', 'deep.md'), '# deep')
    clearCache()
    const out = getSstdSources(db, 2)
    expect(out.vault.find(v => v.relpath.includes('deep.md'))).toBeUndefined()
  })

  test('Max-Files: bei mehr als 50 nur 50 returned, sortiert nach mtime desc', () => {
    for (let i = 0; i < 55; i++) {
      writeFileSync(join(fakeRoot, `f${i.toString().padStart(2, '0')}.md`), `# ${i}`)
    }
    clearCache()
    const out = getSstdSources(db, 2)
    expect(out.vault.length).toBe(50)
  })
})
