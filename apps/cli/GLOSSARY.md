# GLOSSARY — cli / MCP (DD2)

Node-Welt: der MCP-Server und die scriptbare Node-CLI (getrennt von der Go-TUI in `apps/cli-go`). Übergreifende Begriffe → Wurzel-`GLOSSARY.md`.

- **MCP `devd_*`** — die primäre Agenten-Schnittstelle (Model Context Protocol): jede Backend-Fähigkeit als `devd_<entität>_<verb>`-Tool. Bevorzugter Zugang für KI-Agenten.
- **Node-CLI** — der scriptbare Node-Einstieg, der dieselben Backend-Fähigkeiten über einen REST-Client anspricht.
- **Method-Dispatch** — das Muster der Node-Welt: Kommando → Methode → REST-Aufruf (im Gegensatz zum Cobra-Command-Baum der Go-CLI).
- **Tool-Notes** — pro MCP-Tool eine generierte, durchsuchbare Notiz (Metadaten + Flags aus dem Schema).
- **dd-Alias** — der Kurzname, unter dem der CLI-Einstieg im Terminal aufgerufen wird.
