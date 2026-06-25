-- DD-518 (D50): Seed-SOP 'Neues Projekt aufsetzen' in den DB-SOP-Store (Migration 044).
--   Der globale SOP-Store (sops, SOP-D01/D02) ist Master; die GlobalSettings-Slot-Liste
--   rendert dynamisch aus GET /api/sops. Diese SOP fehlte im Cutover-Import (importSopsFromDir,
--   SOP_FILES) — sie liegt im Vault unter einem anderen Pfad als die übrigen 480-SOPs und wird
--   daher hier mit INLINE-Content (kein Vault-Read zur Laufzeit) per UPSERT eingespielt.
-- Idempotent: ON CONFLICT(sop_key) aktualisiert title/content/source_path statt zu duplizieren.

INSERT INTO sops (sop_key, title, content, source_path, updated_at)
VALUES (
  'neues-projekt-aufsetzen',
  'SOP - Neues Projekt aufsetzen',
  '# SOP — Neues Projekt aufsetzen

## Zweck

Neues Projekt in weniger als 15 Minuten vollständig aufsetzen: DevDash-Eintrag, MCP-Registrierung, Memory-Eintrag, Vault-Doku, CLAUDE.md — alle 3 Säulen aktiv.

## Wann anwenden

Immer wenn ein neues Software-Projekt entsteht, das mit KI-Agenten (Claude Code) bearbeitet wird.

## Die 3 Säulen

| Säule | Was | Wozu |
|---|---|---|
| CLI / MCP | devd-cli + devd-dashboard MCP | Issues, Sprints, Reviews |
| Memory | mcp__memory__add_memory | Kontext über Sessions hinweg |
| Obsidian | Vault-Doku + CLAUDE.md | Struktur, SOPs, Templates |

## Pflichtablauf

### Schritt 1 — DevDash-Projekt anlegen

```sh
export DEVD_PROJECT_ID=<aktuelle-id>  # vorher: devd-cli project list
devd-cli project create <slug> --name "<Projektname>" --prefix <PREFIX>
```

Ergebnis notieren: neue Project-ID + Prefix.

### Schritt 2 — Memory-Eintrag anlegen

Via `mcp__memory__add_memory`:

```
title: <Projektname> — DevDash Setup
body: Projekt-ID: X, Prefix: XX, Stack: <Tech>, Ziel: <Kurzbeschreibung>
domain: Wissen
area: AI
schlagwoerter: [DevDash, <Projektname>, Setup]
wichtigkeit: Zentral
```

### Schritt 3 — Vault-Doku anlegen

Skill `/new-note` aufrufen:
- Ziel-Pfad: `500 CONTEXTS/Home Lab Wiki/20 - Projekte/DOCS-<PROJEKTNAME>/`
- Erste Note: `DOCS-<PROJEKTNAME>/README.md` — Projektübersicht

### Schritt 4 — CLAUDE.md befüllen

Template aus `[[400 AI Agent/410 Central Files/CLAUDE-project-template]]` kopieren.
Alle `<...>`-Platzhalter ersetzen. Im Projekt-Root ablegen.

### Schritt 5 — Erstes Issue erfassen

```sh
devd-cli issue create "Projekt-Setup abschließen" \
  --type core --priority 2 \
  --description "CLAUDE.md, Vault-Doku, MCP-Registrierung"
```

Vgl. `[[SOP - Issues erfassen]]` für Pflichtfelder.

### Schritt 6 — Ersten Sprint planen

```sh
devd-cli sprint create "Sprint 1 — Foundation" --goal "<Sprintziel>"
devd-cli issue update <issue-key> --sprint <sprint-key>
```

### Schritt 7 — MCP registrieren

```sh
claude mcp add devd-dashboard \
  -e DEVD_API_URL=http://localhost:5556 \
  -e DEVD_PROJECT_ID=<neue-project-id> \
  node ~/Obsidian/tools/DeveloperDashboard/mcp/devd-mcp.js
```

### Schritt 8 — Health-Check

```sh
devd-cli project show <neue-project-id>
devd-cli sprint list
```

Via MCP: `devd_project_show` → muss Projekt zurückgeben.

## Ergebnis

- [ ] Projekt in DevDash angelegt (ID + Prefix bekannt)
- [ ] Memory-Eintrag gespeichert
- [ ] Vault-Doku-Ordner existiert
- [ ] CLAUDE.md im Projekt-Root (Platzhalter ersetzt)
- [ ] Mindestens 1 Issue + 1 Sprint vorhanden
- [ ] MCP `devd-dashboard` registriert
- [ ] Health-Check erfolgreich

## Übergang

Nächster Schritt: `[[SOP - Sprint Durchfuehrung]]`',
  'SOP - Neues Projekt aufsetzen.md',
  datetime('now')
)
ON CONFLICT(sop_key) DO UPDATE SET
  title = excluded.title,
  content = excluded.content,
  source_path = excluded.source_path,
  updated_at = datetime('now');
