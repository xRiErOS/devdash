import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { emitTool, generate } from '../../apps/cli-go/codegen/gen-client.mjs'

const pidShape = { project_id: z.union([z.string(), z.number()]).optional() }

describe('DD2-204 Client-Func-Emitter', () => {
  it('einfacher GET mit Pfad-Arg → func + c.Do("GET", ...)', () => {
    const tool = {
      name: 'devd_milestone_show',
      zodShape: { ...pidShape, milestone_id: z.number() },
      handlerSource: `async ({ project_id, milestone_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const data = await apiRequest('GET', \`/api/milestones/\${milestone_id}\`, null, pid)
    return ok(data)
  }`,
    }
    const r = emitTool(tool)
    expect(r.ok).toBe(true)
    expect(r.code).toContain('func (c *Client) MilestoneShow(args generated.MilestoneShowArgs) (json.RawMessage, error) {')
    expect(r.code).toContain('c.Do("GET", path, nil)')
    expect(r.code).toContain('path := "/api/milestones/" + fmt.Sprintf("%v", args.MilestoneId)')
  })

  it('resolveIssueId im Pfad → ResolveIssueID-Call + Fehler-Propagation', () => {
    const tool = {
      name: 'devd_issue_dep_list',
      zodShape: { ...pidShape, id_or_key: z.string() },
      handlerSource: `async ({ project_id, id_or_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const issueId = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('GET', \`/api/backlog/\${issueId}/dependencies\`, null, pid)
    return ok(data)
  }`,
    }
    const r = emitTool(tool)
    expect(r.ok).toBe(true)
    expect(r.code).toContain('idOrKeyIssueID, err := c.ResolveIssueID(args.IdOrKey)')
    expect(r.code).toContain('if err != nil {')
    expect(r.code).toContain('path := "/api/backlog/" + fmt.Sprintf("%d", idOrKeyIssueID) + "/dependencies"')
  })

  it('rest-spread Body → Feld nur bei Pointer != nil gesetzt (omitempty-Äquivalent)', () => {
    const tool = {
      name: 'devd_issue_update',
      zodShape: { ...pidShape, id_or_key: z.string(), title: z.string().optional(), goal: z.string().optional() },
      handlerSource: `async ({ project_id, id_or_key, ...fields }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const id = await resolveIssueId(id_or_key, pid)
    const data = await apiRequest('PUT', \`/api/backlog/\${id}\`, fields, pid)
    return ok(data)
  }`,
    }
    const r = emitTool(tool)
    expect(r.ok).toBe(true)
    expect(r.code).toContain('body := map[string]any{}')
    expect(r.code).toContain('c.Do("PUT", path, body)')
    expect(r.code).toContain('if args.Title != nil {')
    expect(r.code).toContain('body["title"] = *args.Title')
  })

  it('URLSearchParams mit Literal-Wert hinter Guard → if-Bedingung im emittierten Code', () => {
    const tool = {
      name: 'devd_project_list',
      zodShape: { include_archived: z.boolean().optional(), fields: z.string().optional() },
      handlerSource: `async ({ include_archived, fields }) => {
    const params = new URLSearchParams()
    if (include_archived) params.set('include_archived', '1')
    if (fields) params.set('fields', fields)
    const qs = params.toString() ? \`?\${params.toString()}\` : ''
    const data = await apiRequest('GET', \`/api/projects\${qs}\`)
    return ok(data)
  }`,
    }
    const r = emitTool(tool)
    expect(r.ok).toBe(true)
    expect(r.code).toContain('q := url.Values{}')
    expect(r.code).toMatch(/if args\.IncludeArchived != nil && \*args\.IncludeArchived \{\s*q\.Set\("include_archived", "1"\)/)
    expect(r.code).toContain('path += "?" + q.Encode()')
  })

  it('Inline-Flag-Query (cascade) → Guard über den Flag-Pointer', () => {
    const tool = {
      name: 'devd_sprint_delete',
      zodShape: { ...pidShape, id: z.number(), cascade: z.boolean().optional() },
      handlerSource: `async ({ project_id, id, cascade }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    return ok(await apiRequest('DELETE', \`/api/sprints/\${id}\${cascade ? '?cascade=1' : ''}\`, null, pid))
  }`,
    }
    const r = emitTool(tool)
    expect(r.ok).toBe(true)
    expect(r.code).toContain('q.Set("cascade", "1")')
    expect(r.code).toContain('c.Do("DELETE", path, nil)')
  })

  it('Resolver auf optionalem Arg in Query → Nil-Guard statt unconditional Deref (Regressions-Test)', () => {
    const tool = {
      name: 'devd_dependencies_graph',
      zodShape: { ...pidShape, sprint_key: z.string().optional() },
      handlerSource: `async ({ project_id, sprint_key }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const params = new URLSearchParams()
    if (sprint_key) params.set('sprint_id', String(await resolveSprintId(sprint_key, pid)))
    const qs = params.toString() ? \`?\${params.toString()}\` : ''
    return ok(await apiRequest('GET', \`/api/dependencies/graph\${qs}\`, null, pid))
  }`,
    }
    const r = emitTool(tool)
    expect(r.ok).toBe(true)
    // Resolver-Call muss hinter einem Nil-Check auf die optionale Quelle hängen, nicht unconditional
    // direkt nach der Func-Signatur stehen (Regression: nil-pointer-Panic bei fehlendem sprint_key)
    expect(r.code).not.toMatch(/\{\n\tvar err error\n\t[a-zA-Z]+, err = c\.ResolveSprintID\(\*args\.SprintKey\)/)
    expect(r.code).toContain('var sprintKeySprintID int')
    expect(r.code).toMatch(/if args\.SprintKey != nil \{\s*sprintKeySprintID, err = c\.ResolveSprintID\(\*args\.SprintKey\)/)
  })

  it('unsupported Tool → ok:false mit Reason, kein Crash', () => {
    const tool = {
      name: 'devd_document_get',
      zodShape: { milestone_id: z.number().optional(), sprint_key: z.string().optional(), doc_id: z.number() },
      handlerSource: `async ({ project_id, milestone_id, sprint_key, doc_id }) => {
    const pid = resolveProjectId(project_id)
    if (typeof pid === 'object' && pid.error) return ok(pid)
    const base = await docOwnerBase(milestone_id, sprint_key, pid)
    if (!base) return ok(DOC_OWNER_ERR)
    return ok(await apiRequest('GET', \`\${base}/documents/\${doc_id}\`, null, pid))
  }`,
    }
    const r = emitTool(tool)
    expect(r.ok).toBe(false)
    expect(r.reason).toBeTruthy()
  })

  it('generate() über mehrere Tools trennt ok/skip und baut ein kompilierbares Datei-Grundgerüst', () => {
    const tools = [
      {
        name: 'devd_dashboard_home',
        zodShape: {},
        handlerSource: `async () => ok(await apiRequest('GET', '/api/dashboard/home'))`,
      },
      {
        name: 'devd_document_get',
        zodShape: { milestone_id: z.number().optional(), sprint_key: z.string().optional(), doc_id: z.number() },
        handlerSource: `async ({ milestone_id, sprint_key, doc_id }) => {
    const base = await docOwnerBase(milestone_id, sprint_key, null)
    return ok(await apiRequest('GET', \`\${base}/documents/\${doc_id}\`, null, null))
  }`,
      },
    ]
    const { src, okCount, skipped } = generate(tools)
    expect(okCount).toBe(1)
    expect(skipped).toHaveLength(1)
    expect(skipped[0].name).toBe('devd_document_get')
    expect(src).toContain('package api')
    expect(src).toContain('func (c *Client) DashboardHome(')
    expect(src).not.toContain('DocumentGet')
  })
})
