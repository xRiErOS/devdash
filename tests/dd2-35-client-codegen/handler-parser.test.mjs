import { describe, it, expect } from 'vitest'
import { analyzeHandler } from '../../apps/cli-go/codegen/handler-parser.mjs'

describe('DD2-203 apiRequest-Handler-Extraktion', () => {
  it('einfacher GET mit einem Pfad-Arg', () => {
    const src = `async ({ project_id, milestone_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('GET', \`/api/milestones/\${milestone_id}\`, null, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_milestone_show', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.method).toBe('GET')
    expect(r.pathParts).toEqual([{ kind: 'lit', text: '/api/milestones/' }, { kind: 'arg', name: 'milestone_id', escape: false }])
    expect(r.body).toBeNull()
  })

  it('encodeURIComponent(String(x)) Pfad-Arg', () => {
    const src = `async ({ id_or_slug }) => {
    const data = await apiRequest('GET', \`/api/projects/\${encodeURIComponent(String(id_or_slug))}\`)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_project_show', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.pathParts[1]).toMatchObject({ kind: 'arg', name: 'id_or_slug', escape: true })
  })

  it('resolveIssueId im Pfad', () => {
    const src = `async ({ project_id, id_or_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('GET', \`/api/backlog/\${issueId}/dependencies\`, null, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_issue_dep_list', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.pathParts).toContainEqual({ kind: 'resolvedIssue', argName: 'id_or_key', escape: false })
  })

  it('zwei verschiedene Resolver-Rollen (id_or_key + depends_on)', () => {
    const src = `async ({ project_id, id_or_key, depends_on, note }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(String(id_or_key), pid)
    const onId = await resolveIssueId(String(depends_on), pid)
    const body = { depends_on_id: Number(onId) }
    if (note !== undefined) body.note = note
    const data = await apiRequest('POST', \`/api/backlog/\${issueId}/dependencies\`, body, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_issue_dep_add', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.pathParts).toContainEqual({ kind: 'resolvedIssue', argName: 'id_or_key', escape: false })
    expect(r.body.kind).toBe('fields')
    const dependsOn = r.body.fields.find((f) => f.key === 'depends_on_id')
    expect(dependsOn.source).toMatchObject({ kind: 'cast', cast: 'Number', inner: { kind: 'resolvedIssue', argName: 'depends_on' } })
    const noteField = r.body.fields.find((f) => f.key === 'note')
    expect(noteField.source).toMatchObject({ kind: 'arg', name: 'note' })
  })

  it('rest-spread Body', () => {
    const src = `async ({ project_id, id_or_key, ...fields }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('PUT', \`/api/backlog/\${id}\`, fields, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_issue_update', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.body).toEqual({ kind: 'rest', restName: 'fields' })
    expect(r.declaredNames).toEqual(['project_id', 'id_or_key'])
  })

  it('inkrementell gebauter Body mit optionalem Feld', () => {
    const src = `async ({ project_id, id_or_key, status, notes }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    const body = { status }
    if (notes) body.notes = notes
    const data = await apiRequest('PATCH', \`/api/backlog/\${id}/status\`, body, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_issue_status', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.body.kind).toBe('fields')
    expect(r.body.fields).toContainEqual({ key: 'status', source: { kind: 'arg', name: 'status' }, guardArg: null })
    expect(r.body.fields).toContainEqual({ key: 'notes', source: { kind: 'arg', name: 'notes' }, guardArg: 'notes' })
  })

  it('Literal-Wert hinter if-Guard in params.set — Guard MUSS erfasst werden (sonst immer gesetzt)', () => {
    const src = `async ({ include_archived, fields }) => {
    const params = new URLSearchParams()
    if (include_archived) params.set('include_archived', '1')
    const qs = params.toString() ? \`?\${params.toString()}\` : ''
    const data = await apiRequest('GET', \`/api/projects\${qs}\`)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_project_list', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.query).toContainEqual({ key: 'include_archived', source: { kind: 'literal', value: '1' }, guardArg: 'include_archived' })
  })

  it('URLSearchParams-Query mit mehreren optionalen Feldern', () => {
    const src = `async ({ include_archived, fields }) => {
    const params = new URLSearchParams()
    if (include_archived) params.set('include_archived', '1')
    if (fields) params.set('fields', fields)
    const qs = params.toString() ? \`?\${params.toString()}\` : ''
    const data = await apiRequest('GET', \`/api/projects\${qs}\`)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_project_list', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.query).toEqual([
      { key: 'include_archived', source: { kind: 'literal', value: '1' }, guardArg: 'include_archived' },
      { key: 'fields', source: { kind: 'arg', name: 'fields' }, guardArg: 'fields' },
    ])
  })

  it('Ternary-Qs-Shortcut (einzelnes Filterfeld)', () => {
    const src = `async ({ project_id, search }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const qs = search ? \`?search=\${encodeURIComponent(search)}\` : ''
    return ok(await apiRequest('GET', \`/api/user-notes\${qs}\`, null, pid))
  }`
    const r = analyzeHandler({ name: 'devd_user_note_list', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.query).toEqual([{ key: 'search', source: { kind: 'arg', name: 'search', escape: true }, guardArg: null }])
  })

  it('Inline-Flag-Query direkt im Pfad-Template (cascade)', () => {
    const src = `async ({ project_id, id, cascade }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('DELETE', \`/api/sprints/\${id}\${cascade ? '?cascade=1' : ''}\`, null, pid))
  }`
    const r = analyzeHandler({ name: 'devd_sprint_delete', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.query).toEqual([{ key: 'cascade', source: { kind: 'literal', value: '1' }, guardArg: 'cascade' }])
  })

  it('pid im Pfad-Template (todo_list-Muster)', () => {
    const src = `async ({ project_id, status }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const qs = status ? \`?status=\${status}\` : ''
    const data = await apiRequest('GET', \`/api/projects/\${encodeURIComponent(pid)}/todos\${qs}\`, null, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_todo_list', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.pathParts).toContainEqual({ kind: 'pid', escape: true })
  })

  it('lehnt if/else-Branching ab (sprint_key null/none Sonderfall)', () => {
    const src = `async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams()
    if (sprint_key) {
      if (sprint_key === 'null' || sprint_key === 'none') {
        params.set('sprint_id', 'null')
      } else {
        const sprintId = await resolveSprintId(sprint_key, pid)
        params.set('sprint_id', sprintId)
      }
    }
    const qs = params.toString() ? \`?\${params.toString()}\` : ''
    const data = await apiRequest('GET', \`/api/backlog\${qs}\`, null, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_issue_list', handlerSource: src })
    expect(r.ok).toBe(false)
  })

  it('lehnt Pfad ab, der aus unbekannter async-Helper-Var (docOwnerBase) gebaut wird', () => {
    const src = `async ({ project_id, milestone_id, sprint_key, doc_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const base = await docOwnerBase(milestone_id, sprint_key, pid)
    if (!base) return ok(DOC_OWNER_ERR)
    return ok(await apiRequest('GET', \`\${base}/documents/\${doc_id}\`, null, pid))
  }`
    const r = analyzeHandler({ name: 'devd_document_get', handlerSource: src })
    expect(r.ok).toBe(false)
  })

  it('umbenannte Destrukturierung ({ old: oldTag, new: newTag })', () => {
    const src = `async ({ project_id, old: oldTag, new: newTag }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('POST', '/api/project-memory-tags/rename', { old: oldTag, new: newTag }, pid))
  }`
    const r = analyzeHandler({ name: 'devd_memory_tag_rename', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.body.fields).toContainEqual({ key: 'old', source: { kind: 'arg', name: 'old' }, guardArg: null })
    expect(r.body.fields).toContainEqual({ key: 'new', source: { kind: 'arg', name: 'new' }, guardArg: null })
  })

  it('URLSearchParams mit initialem Objekt-Arg ({ q })', () => {
    const src = `async ({ project_id, q, category, limit }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams({ q })
    if (category) params.set('category', category)
    if (limit) params.set('limit', String(limit))
    const data = await apiRequest('GET', \`/api/project-memories/search?\${params.toString()}\`, null, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_project_memory_query', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.query).toContainEqual({ key: 'q', source: { kind: 'arg', name: 'q' }, guardArg: null })
    expect(r.query).toContainEqual({ key: 'category', source: { kind: 'arg', name: 'category' }, guardArg: 'category' })
  })

  it('Body ohne Argumente (dashboard_home)', () => {
    const src = `async () => ok(await apiRequest('GET', '/api/dashboard/home'))`
    const r = analyzeHandler({ name: 'devd_dashboard_home', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.method).toBe('GET')
    expect(r.pathParts).toEqual([{ kind: 'lit', text: '/api/dashboard/home' }])
  })

  it('optionaler Resolver über lokale let-Variable + späteren Re-Guard (issue_create_full-Muster, DD2-207-Regression)', () => {
    const src = `async ({ project_id, title, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    let sprintId = null
    if (sprint_key) {
      sprintId = Number(await resolveSprintId(sprint_key, pid))
    }
    const createBody = { title }
    if (sprintId !== null) createBody.sprint_id = sprintId
    const data = await apiRequest('POST', '/api/backlog', createBody, pid)
    return ok(data)
  }`
    const r = analyzeHandler({ name: 'devd_issue_create_full', handlerSource: src })
    expect(r.ok).toBe(true)
    expect(r.body.kind).toBe('fields')
    const sprintField = r.body.fields.find((f) => f.key === 'sprint_id')
    expect(sprintField).toMatchObject({
      guardArg: 'sprintId',
      source: { kind: 'cast', cast: 'Number', inner: { kind: 'resolvedSprint', argName: 'sprint_key' } },
    })
  })
})
