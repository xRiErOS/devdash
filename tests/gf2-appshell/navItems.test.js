// tests/gf2-appshell/navItems.test.js
import { describe, it, expect } from 'vitest'
import { PROJECT_ROUTES, GLOBAL_ROUTES, DROPPED_PATHS } from '../../src/screens/_shell/navItems.js'

describe('navItems route contract', () => {
  it('hat genau die 13 projekt-scoped Vertrags-Routen', () => {
    const paths = PROJECT_ROUTES.map((r) => r.path)
    expect(paths).toEqual([
      'home', 'roadmap', 'milestones', 'milestones/:id',
      'sprints', 'sprints/:id', 'issues', 'issues/:id',
      'backlog', 'review/:sprintId', 'memories', 'settings',
    ])
  })
  it('droppt board + legacy + dependencies', () => {
    expect(DROPPED_PATHS).toContain('board')
    expect(DROPPED_PATHS).toContain('dependencies')
    expect(DROPPED_PATHS).toContain('memories/global')
  })
  it('globale Routen = projects + settings + sops', () => {
    expect(GLOBAL_ROUTES.map((r) => r.path)).toEqual([
      'projects', 'settings', 'settings/sops', 'settings/sops/:key',
    ])
  })
})
