# GLOSSARY-MAP

DD2 ist multi-surface — mehrere Bounded Contexts mit je eigener „ubiquitous language". Ein Glossar je Surface, impl-frei:

- `GLOSSARY.md` (Wurzel) — surface-übergreifende Begriffe (Issue, Sprint, Meilenstein, User-Story, Refinement, Projekt).
- `apps/backend/GLOSSARY.md` — Lifecycle, Contracts, Entitäten, Multi-Tenant, Capture-Host, Gates.
- `apps/frontend/GLOSSARY.md` — Storybook-Insel, Promote-Loop, Screens, Tier, Token.
- `apps/cli-go/GLOSSARY.md` — TUI-Welt (command view, browse-tree, detail-accordion, review-cockpit).
- `apps/cli/GLOSSARY.md` — MCP `devd_*` + Node-CLI.

Konventionen:
- Glossar = **nur Begriffe** (was heißt X). Implementierungsfrei.
- **Locations** (wo liegt X) → Router in `CLAUDE.md`, nicht hierher.
- **Decisions/Patterns** → `project_memory`, nicht hierher.
- Gepflegt vom `domain-modeling`-Skill (schärft Begriffe, sobald sie sich kristallisieren).
