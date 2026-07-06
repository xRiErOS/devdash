# apps/cli/mcp — devd-MCP Server

`devd-mcp.js` registriert alle Tools via `server.tool(name, desc, zodShape, handler)` und ist die **Source-of-Truth** für die MCP-Fähigkeiten.

## Tool-Notes-Sammlung (Vault)

Pro MCP-Tool existiert eine Bases-durchsuchbare Obsidian-Note (Frontmatter `Tool/RW/Zweck/Domäne/Interaktion/Aktivität`, Body = Desc + Flags-Tabelle aus dem Zod-Schema). Drei Filter-Dimensionen: `Domäne`=Entity, `Interaktion`=Verb, `Aktivität`=PO-Workflow-Phase (Backlog/Refinement/Sprintplanung/Roadmapplanung/Sprintdurchführung/Sprint-Review; Meta-Tooling leer). Generiert — **nicht händisch pflegen**:

```
npm run gen:mcp-notes
```

Generator: `scripts/gen-mcp-notes.mjs` (re-runnbar; entschärft den top-level `server.connect` per Prototype-Stub, introspiziert die Zod-Shapes via `z.toJSONSchema`). Output-Default: `Vault/300 PROJECTS/DD_DevDashboard/DD-PO-Lokal/MCP/devd-MCP/` (124 Notes + `_devd-MCP-Index.md` mit Counts je Domäne + Lücken-Sektion). Bei neuen/entfernten Tools erneut laufen lassen (Assert auf erwartete Tool-Zahl im Script anpassen).

## Go-TUI-Client (D07 Freshness-/Coverage-Gate, DD2#37)

`apps/cli-go` generiert seinen HTTP-Client aus dieser Datei (`apps/cli-go/codegen/*.mjs`). **Jedes Tool hier hinzugefügt/geändert/entfernt → vor Commit Pflicht:**

```sh
npm run gen:cli-client
```

Sonst wird CI rot (`.github/workflows/codegen-freshness.yml` prüft `git diff --exit-code` auf `apps/cli-go/internal/api/generated.go` + `generated/generated_types.go` + `generated/capabilities.json` + `codegen/skip-allowlist.json`) — oder schlimmer: die Baseline bleibt lokal grün, aber bereits stale (Vorfall DD2#37: `devd_project_create`/`devd_project_delete` wurden ohne Regen committed, `capabilities.json` driftete unbemerkt). Voller Workflow: `docs/cli-go-build.md` → Sektion „Codegen-Workflow".
