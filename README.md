# DeveloperDashboard

Sprint-/Issue-Tracking für Vibe-Coding-Projekte (Backend, Frontend, CLI/TUI, MCP-Server). Kanonischer Doku-Einstieg ist `CLAUDE.md` (Trigger-Tabelle → Detail-Doc pro Thema).

## MCP-Tool-Dokumentation

Der devd-dashboard MCP-Server (`apps/cli/mcp/devd-mcp.js`) wird per Zod-Introspektion automatisch dokumentiert:

```sh
node scripts/gen-mcp-notes.mjs
```

Schreibt 1 Concept pro Domäne, gebündelt (~19 Files) → OKF Knowledge Catalogue [`dev-wiki/cli-devdash-mcp/mcp-tool-reference/`](~/Obsidian/Knowledge-Catalogue/dev-wiki/cli-devdash-mcp/mcp-tool-reference/index.md) — einziges Ziel, keine Vault-Dopplung. Läuft inkl. §9-Conformance-Scan + `okf-cli.py reindex`; Exit-Code 1 bei Violations (kein Commit vor „OK — 0 violations"). Re-runnbar/idempotent — bei MCP-Änderungen (Tool hinzu/entfernt/umbenannt) einfach erneut ausführen.

Quelle der Wahrheit ist ausschließlich `apps/cli/mcp/devd-mcp.js` — die Ausgabe wird vollständig überschrieben, nicht von Hand editieren.

## Weitere Doku

Siehe `CLAUDE.md` für die vollständige Trigger-Tabelle (Design, Produkt, Storybook, TUI, Sprint-Workflow, Skills, Glossar, u.a.).
