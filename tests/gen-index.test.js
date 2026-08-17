import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const generator = join(process.cwd(), 'scripts/gen-index.mjs')

describe('gen-index nested documents', () => {
  test('includes a nested Markdown document using its relative path', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'gen-index-'))
    const topic = join(fixture, 'topic')
    const document = join(topic, 'nested.md')
    execFileSync('mkdir', ['-p', topic])
    writeFileSync(document, '---\ntitle: Nested document\ndescription: A nested entry\n---\n')

    execFileSync(process.execPath, [generator, fixture])

    const index = readFileSync(join(fixture, 'INDEX.md'), 'utf8')
    expect(index).toContain(`| Nested document | A nested entry | \`${fixture}/topic/nested.md\` |`)
  })
})
