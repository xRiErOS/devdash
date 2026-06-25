// DD-307 (M3-S01 T09): Validation für milestones.spec_path.
//
// spec_path ist relativ zum projects.repo_path. Path-Traversal wird abgelehnt
// (analog DD-281 sstdSources-Whitelist):
//   - reject '..' Segmente
//   - reject absolute Pfade
//   - reject Pfade die nach path.resolve außerhalb repo_path liegen
// Spec sollte üblicherweise .md-Endung haben (warning, kein hard reject).

import { resolve as pathResolve, isAbsolute } from 'path'

export class MilestoneSpecPathError extends Error {
  constructor(message, { statusCode = 400, code, field = 'spec_path' } = {}) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.field = field
  }
}

/**
 * Validates spec_path against repo_path. Returns trimmed value or throws.
 * If spec_path is null/empty, returns null (clear-intent).
 */
export function validateSpecPath(value, { repoPath } = {}) {
  if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
    return null
  }
  if (typeof value !== 'string') {
    throw new MilestoneSpecPathError('spec_path muss String sein', { code: 'SPEC_PATH_INVALID' })
  }
  const trimmed = value.trim()
  if (isAbsolute(trimmed)) {
    throw new MilestoneSpecPathError(
      'spec_path muss relativ zum repo_path sein (keine absoluten Pfade)',
      { code: 'SPEC_PATH_OUTSIDE_REPO' }
    )
  }
  if (trimmed.includes('..')) {
    throw new MilestoneSpecPathError(
      'spec_path enthält ".." (path-traversal)',
      { code: 'SPEC_PATH_OUTSIDE_REPO' }
    )
  }
  if (repoPath) {
    const resolved = pathResolve(repoPath, trimmed)
    const normalizedRepo = pathResolve(repoPath)
    if (!resolved.startsWith(normalizedRepo + '/') && resolved !== normalizedRepo) {
      throw new MilestoneSpecPathError(
        'spec_path liegt außerhalb des repo_path',
        { code: 'SPEC_PATH_OUTSIDE_REPO' }
      )
    }
  }
  return trimmed
}

/**
 * Builds an Obsidian/IDE link for the spec file. Returns null if no spec_path.
 * Prefers obsidian://-URI when path looks like Vault-content (heuristic).
 */
export function buildSpecLink(specPath, { repoPath } = {}) {
  if (!specPath) return null
  return {
    spec_path: specPath,
    spec_url: `file://${pathResolve(repoPath || '.', specPath)}`,
  }
}
