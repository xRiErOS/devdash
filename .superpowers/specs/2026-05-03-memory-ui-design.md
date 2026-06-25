---
uid: 38cced36-b8cf-4287-8703-c4ae7f994e4d
---
# Memory UI — Design Spec

**Datum:** 2026-05-03  
**Status:** Approved  
**Scope:** Integration einer Memory-Verwaltungsseite in DevDashboard

## Ziel

Vollständiges CRUD-Interface für das lokale SQLite-vec Memory-System (`~/.claude/memory.db`) direkt im DevDashboard. Kein separates Tool, keine REST-API-Hülle um memory_mcp.py.

## Anforderungen

- **Operationen:** Lesen, Bearbeiten, Anlegen, Löschen
- **Layout:** Split View — Filterbarliste links, Detail/Edit-Panel rechts
- **Filter:** Freitextsuche, Domain, Area, Wichtigkeit, Schlagwort (alle horizontal)
- **Embedding:** Bei Create und Text-Edit → Ollama direkt aufrufen (bge-m3, 1024 dim)
- **Zugriff:** Via Tailscale erreichbar (DevDashboard ist bereits an alle Interfaces gebunden)

## Architektur

```
memory.db (SQLite-vec, Symlink auf Seafile)
    ├── memory_mcp.py          ← unverändert, Claude Code Zugriff
    └── server/lib/memoryDb.js ← NEU, second connection (better-sqlite3 + sqlite-vec)
           │
    server/api.js              ← neue Routes /api/memories/*
           │
    src/views/MemoryView.jsx   ← NEU, Route /memories
    src/components/IconSidebar.jsx  ← +1 Icon
    src/components/Layout.jsx       ← +Shortcut 'e'
    src/App.jsx                     ← +1 Route
```

Ollama-Embedding:
```
Text-Änderung → POST $OLLAMA_URL/api/embed { model: "bge-m3", input: text }
             → float[1024] → DELETE memory_vec (Update) → INSERT memory_vec
```

ENV: `OLLAMA_URL` (Default: `http://localhost:11434`), `MEMORY_DB_PATH` (Default: `~/.claude/memory.db`), `OLLAMA_EMBED_MODEL` (Default: `bge-m3`)

## Backend

### server/lib/memoryDb.js

```js
import Database from 'better-sqlite3'
import * as sqliteVec from 'sqlite-vec'

const memDb = new Database(process.env.MEMORY_DB_PATH || '/Users/erik/.claude/memory.db')
memDb.pragma('journal_mode = WAL')
sqliteVec.load(memDb)
```

Exports: `listMemories(filters)`, `getMemory(id)`, `createMemory(data, embedding)`, `updateMemory(id, data, embedding?)`, `deleteMemory(id)`

### API-Routes in api.js

| Method | Route | Beschreibung |
|--------|-------|-------------|
| `GET` | `/api/memories` | Liste, paginiert (50/Seite), Filter: `q`, `domain`, `area`, `wichtigkeit`, `schlagwort`, `page` |
| `GET` | `/api/memories/:id` | Einzelnes Memory |
| `POST` | `/api/memories` | Anlegen + Ollama-Embedding |
| `PUT` | `/api/memories/:id` | Bearbeiten; Text-Änderung → Re-Embed |
| `DELETE` | `/api/memories/:id` | Löscht aus `memories` + `memory_vec` |

Sortierung: `updated_at DESC`. Schlagwort-Filter: `LIKE '%term%'` auf `schlagwoerter`-Spalte.

## Frontend

### MemoryView.jsx — Struktur

```
<MemoryView>
  <FilterBar />          ← horizontal: Suche + 3 Dropdowns + Schlagwort-Input
  <SplitPane>
    <MemoryList />        ← scrollbar, Pagination, Klick → selectedId
    <MemoryDetail />      ← Edit-Form, Speichern/Löschen-Buttons, Tag-Chips
  </SplitPane>
</MemoryView>
```

### memory.db Schema (relevante Spalten)

```sql
CREATE TABLE memories (
    id           TEXT PRIMARY KEY,
    text         TEXT NOT NULL,
    domain       TEXT NOT NULL,   -- 'Privat' | 'Beruf' | 'Wissen'
    area         TEXT NOT NULL,
    area_sek     TEXT,            -- JSON-Array, out of scope für UI
    schlagwoerter TEXT,           -- JSON-Array als Text
    wichtigkeit  TEXT,            -- 'Zentral' | 'Wichtig' | 'Peripher'
    quelle_typ   TEXT NOT NULL,   -- 'bestätigt' | 'abgeleitet'
    quelle       TEXT NOT NULL,
    created_at   TEXT NOT NULL,
    updated_at   TEXT NOT NULL,
    project      TEXT
)
```

### UI-Konventionen

- Catppuccin CSS-Variablen (`var(--peach)`, `var(--green)`, etc.) — wie alle DevD-Views
- Domain-Farben: `Privat` → blue, `Beruf` → peach, `Wissen` → mauve
- Wichtigkeit-Farben: `Zentral` → yellow, `Wichtig` → green, `Peripher` → hint
- Toast-System: `window.dispatchEvent(new CustomEvent('devd-toast', { detail: { message, kind } }))`
- Keyboard-Shortcut: `e` → navigate('/memories')
- Touch-Targets min 44px, font-size 16px auf Inputs (gegen iOS-Zoom)
- Filterleiste horizontal, volle Bildschirmbreite ausnutzen

## Datenfluss

### Create

1. User füllt Formular, klickt Speichern
2. `POST /api/memories` mit `{ text, domain, area, wichtigkeit, schlagwoerter }` — `quelle_typ` wird auf `'bestätigt'` gesetzt, `quelle` auf `'devd-memory-ui'`
3. Backend generiert UUID, ruft Ollama auf
4. Ollama antwortet mit `float[1024]`
5. Transaction: INSERT memories + INSERT memory_vec
6. 201 zurück, Frontend fügt Memory in Liste ein

### Update

1. User editiert Felder, klickt Speichern
2. `PUT /api/memories/:id`
3. Text geändert? → Ollama-Call → DELETE memory_vec → INSERT memory_vec
4. UPDATE memories SET ..., updated_at = datetime('now')
5. 200 zurück

### Delete

1. User klickt Löschen (Bestätigungs-Dialog)
2. `DELETE /api/memories/:id`
3. Transaction: DELETE memory_vec + DELETE memories
4. 204 zurück, Frontend entfernt Memory aus Liste

## Fehlerbehandlung

| Fehler | Verhalten |
|--------|-----------|
| Ollama nicht erreichbar | Text trotzdem speichern; Toast "Embedding fehlgeschlagen — semantische Suche evtl. veraltet" |
| Memory nicht gefunden | 404 → Frontend Error-Toast |
| Concurrent Write (MCP + UI) | WAL-Mode serialisiert automatisch |
| sqlite-vec Extension nicht ladbar | Server-Start schlägt fehl mit klarer Fehlermeldung |

## Neue Abhängigkeit

```bash
npm install sqlite-vec
```

sqlite-vec stellt native Node.js Bindings für die vec0-Extension bereit.

## Neue Dateien

| Pfad | Art |
|------|-----|
| `server/lib/memoryDb.js` | NEU |
| `src/views/MemoryView.jsx` | NEU |

## Geänderte Dateien

| Pfad | Änderung |
|------|----------|
| `server/api.js` | +5 Routes (~60 Zeilen) |
| `src/App.jsx` | +1 Route `/memories` |
| `src/components/IconSidebar.jsx` | +1 Icon (Brain/Database) |
| `src/components/Layout.jsx` | +Shortcut `e`, +`'g e'` |
