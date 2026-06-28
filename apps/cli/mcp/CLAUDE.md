# apps/cli/mcp — devd-MCP Server

`devd-mcp.js` registriert alle Tools via `server.tool(name, desc, zodShape, handler)` und ist die **Source-of-Truth** für die MCP-Fähigkeiten.

## Tool-Notes-Sammlung (Vault)

Pro MCP-Tool existiert eine Bases-durchsuchbare Obsidian-Note (Frontmatter `Tool/RW/Zweck/Domäne/Interaktion/Aktivität`, Body = Desc + Flags-Tabelle aus dem Zod-Schema). Drei Filter-Dimensionen: `Domäne`=Entity, `Interaktion`=Verb, `Aktivität`=PO-Workflow-Phase (Backlog/Refinement/Sprintplanung/Roadmapplanung/Sprintdurchführung/Sprint-Review; Meta-Tooling leer). Generiert — **nicht händisch pflegen**:

```
npm run gen:mcp-notes
```

Generator: `scripts/gen-mcp-notes.mjs` (re-runnbar; entschärft den top-level `server.connect` per Prototype-Stub, introspiziert die Zod-Shapes via `z.toJSONSchema`). Output-Default: `Vault/300 PROJECTS/DD_DevDashboard/DD-PO-Lokal/MCP/devd-MCP/` (124 Notes + `_devd-MCP-Index.md` mit Counts je Domäne + Lücken-Sektion). Bei neuen/entfernten Tools erneut laufen lassen (Assert auf erwartete Tool-Zahl im Script anpassen).
