// @index
// title: memory-tag-register.data
// desc: Daten — PO-freigegebenes Seed + Merge-Map für das memory_tags-Register (Single Source)
// @end
// MEM-25: PO-freigegebenes Seed + Merge-Map für das memory_tags-Register (Projekt 2, devd).
// Quelle: PO-Gate E01 (21-UserInputFiles/2026-06-21 DD UserInput — Memory-Tag-Register …),
// PO Erik 2026-06-21. Single Source für das Apply-Script + den Validierungs-Test.
//
// Q04 → frontend-rework wird in `frontend` gefaltet (kanonisch = frontend).
// Typo-Fix: archiecture-heartbeat → architecture-heartbeat (PO bestätigt).

// 53 kanonische Tags (nach Merge/Drop). Reihenfolge = Sektionen aus dem PO-Gate.
export const CANONICAL = [
  // Programm/Scope
  'gf-2', 'frontend', 'terminal-design', 'roadmap', 'scope', 'consolidation', 'cutover', 'phase', 'meilenstein',
  // Storybook/Architektur
  'storybook', 'atomic-design', 'taxonomy', 'data-ui', 'design-system', 'tokens', 'reference-chain',
  'contract-first', 'architektur', 'archetypes', 'drift-prevention', 'enforcement', 'organisms', 'molecules',
  'c4-architecture', 'architecture-heartbeat', 'templates', 'screens', 'slots',
  // Komponenten/Features
  'appshell', 'entity-detail', 'breadcrumb', 'fab', 'global-settings',
  // Prozess/Infra
  'sstd', 'sop', 'worktree', 'git', 'migration', 'deploy', 'docker', 'lifecycle', 'review', 'mobile-ux',
  'testing', 'e2e', 'playwright', 'workflow', 'tui', 'dedup', 'status', 'design', 'tailscale', 'portainer',
]

// Synonym-Folds [alt, kanonisch]. Alt-Tag wird angelegt, dann via rename in den kanonischen
// gemerged (repoint + dedupe + alt-Row weg). Kanonische Ziele stehen in CANONICAL.
export const MERGES = [
  ['greenfield', 'gf-2'],
  ['GF-2', 'gf-2'],
  ['gf2', 'gf-2'],
  ['mobile', 'mobile-ux'],
  ['sstd-decision', 'sstd'],
  ['frontend-rework', 'frontend'],
]
