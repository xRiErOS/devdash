# /docs — devd2 Knowledge (OKF)

This `/docs` folder is OKF-structured project knowledge, driven by the `/okf-p` skill.

## Two zones
- **`devd2-okf/`** — the OKF bundle. Strict: every non-reserved `.md` has YAML
  frontmatter with a non-empty `type`. Written only via `/okf-p ingest` (never by hand).
- **`_free-notes/`** — freeform, git-ignored, no rules. Scratch, drafts, dumps.

## Type + config authority
Valid `type` values and all tooling config: see **`.okf.toml`** →
central `TYPES.md` at `/Users/erik/Obsidian/Knowledge-Catalogue/TYPES.md`. Do not add a local TYPES.md.

## Working here
- Knowledge → the bundle (`/okf-p ingest`). Work-state → this folder's `ROADMAP.md`
  (long-term plan) and `SSTD.md` (current status, `/sstd` format).
- `GLOSSARY.md` (domain terms) is maintained via the `domain-modeling` skill.
- Conformance: `/okf-p audit` (wraps `okf-cli check`). Must be `OK — 0 violations`.
- This is a plain git repo — normal Read/Write/Edit/git. Not the Obsidian Vault.
