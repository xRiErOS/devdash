# GLOSSARY — backend (DD2)

Backend-Surface: Datenmodell, Status-Maschine, Persistenz, Zugriffs-Guards. Übergreifende Begriffe → Wurzel-`GLOSSARY.md`.

- **Lifecycle** — die Status-Maschine je Entität. Issue: `new → refined → in_progress → to_review → passed`; Sprint/Meilenstein analog. Transitions sind validiert, nie roh in SQL.
- **Contract** — die Datenmodell-Wahrheit einer Entität als Schema (Shape + Validierung). Quelle, gegen die Ein- und Ausgaben geprüft werden.
- **Multi-Tenant / project_id** — eine zentrale DB, pro Projekt isolierte Daten über den `project_id`-Fremdschlüssel. Das aktive Projekt wird aus dem Key-Prefix abgeleitet.
- **Capture-Host** — der öffentliche Erfassungs-Host hinter einer Allowlist: nur wenige Erfassungs-Endpunkte sind erlaubt, alles andere wird abgewiesen.
- **User-Story-Gate (G1/G2)** — Abnahme am testbaren Artefakt: ein Issue wird nur `passed`, wenn alle seine User-Stories `passed` sind (G1); ein Issue kommt nur in einen Sprint mit mindestens einer User-Story (G2).
- **Cascade-Delete** — das Löschen einer Elternentität räumt abhängige Kinder und Beziehungen konsistent mit auf.
