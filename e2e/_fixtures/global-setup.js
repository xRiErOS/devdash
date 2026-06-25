import Database from 'better-sqlite3'
import { existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '../..')
const E2E_DB_PATH = resolve(ROOT, 'data/devd.dd267-e2e.db')

// DD-267: globalSetup für Playwright — minimaler isolierter DB-Bootstrap.
// Anstelle der vollen Migrationskette (deren Voraussetzung Basis-Schema aus
// einer Produktions-DB ist) bauen wir hier die benötigten Tabellen direkt auf.
// Production-DB bleibt unberührt.
export default async function globalSetup() {
  console.log('[dd267:setup] preparing fresh devd.dd267-e2e.db…')

  for (const suffix of ['', '-wal', '-shm']) {
    const p = E2E_DB_PATH + suffix
    if (existsSync(p)) rmSync(p, { force: true })
  }
  mkdirSync(dirname(E2E_DB_PATH), { recursive: true })

  const db = new Database(E2E_DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Minimal-Schema für DD-267-Acceptance: nur die Tabellen, die die API
  // beim GET /api/sprints joint (projects + milestones + sprints + backlog).
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      slug        TEXT UNIQUE NOT NULL,
      name        TEXT NOT NULL,
      description TEXT,
      color       TEXT,
      prefix      TEXT,
      archived    INTEGER DEFAULT 0,
      sstd_content TEXT,
      sstd_updated_at DATETIME,
      preview_url TEXT,
      ai_summary TEXT,
      ai_summary_updated_at DATETIME,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      target_date DATE,
      status TEXT NOT NULL DEFAULT 'open',
      position INTEGER DEFAULT 0,
      deferred INTEGER NOT NULL DEFAULT 0,
      spec_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, name)
    );

    -- DD-406: milestone_dod_items (Migration 031) — manuelle DoD-Checkliste pro
    -- Milestone. Fehlte im e2e-Schema -> m02-s02 t09-dod-checkbox + dd277 failten
    -- mit "no such table". Schema verbatim aus migrations/031_v3_milestone_dod_items.sql.
    CREATE TABLE IF NOT EXISTS milestone_dod_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      done INTEGER NOT NULL DEFAULT 0 CHECK(done IN (0, 1)),
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_dod_items_milestone ON milestone_dod_items(milestone_id, position);

    -- DD-407: milestone_dependencies (Migration 030) — Vorgaenger/Nachfolger-Kanten.
    -- m02-s02/t10-dependency-editor legt sie zur Laufzeit via API an + raeumt auf;
    -- die Tabelle muss existieren, sonst 500 'no such table'.
    CREATE TABLE IF NOT EXISTS milestone_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      predecessor_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      successor_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(predecessor_id, successor_id),
      CHECK(predecessor_id != successor_id)
    );
    CREATE INDEX IF NOT EXISTS idx_milestone_deps_predecessor ON milestone_dependencies(predecessor_id);
    CREATE INDEX IF NOT EXISTS idx_milestone_deps_successor ON milestone_dependencies(successor_id);

    CREATE TABLE IF NOT EXISTS sprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      project_number INTEGER,
      name TEXT,
      start_date DATE,
      end_date DATE,
      status TEXT NOT NULL DEFAULT 'planning',
      capacity INTEGER,
      wip_limit INTEGER,
      notes TEXT,
      goal TEXT,
      milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL,
      position INTEGER DEFAULT 0,
      planning_prompt TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS backlog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      project_number INTEGER,
      title TEXT NOT NULL,
      type TEXT,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'new',
      priority INTEGER DEFAULT 2,
      milestone TEXT,
      plugin_key TEXT,
      goal TEXT,
      background TEXT,
      context_notes TEXT,
      relevant_files TEXT,
      po_notes TEXT,
      assigned_sprint INTEGER REFERENCES sprints(id),
      result TEXT,
      test_instruction TEXT,
      created_by_user TEXT,
      acceptance_criteria TEXT,
      completed_at DATETIME,
      deleted_at DATETIME,
      refined_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Baseline-Schema: Spalte heisst 'timestamp' (NICHT created_at). GET
    -- /api/backlog/:id/activity selektiert 'timestamp' → created_at wuerde
    -- "no such column" werfen (Plan 04 T3 Activity-Tab).
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      agent_id TEXT,
      action TEXT,
      table_name TEXT,
      record_id INTEGER,
      old_value TEXT,
      new_value TEXT
    );

    -- DD-277: issue_files wird beim Anlegen via POST /api/backlog synced (DD-129).
    CREATE TABLE IF NOT EXISTS issue_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_id INTEGER REFERENCES backlog(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      position INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER REFERENCES projects(id),
      name TEXT NOT NULL,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(project_id, name)
    );

    CREATE TABLE IF NOT EXISTS backlog_tags (
      backlog_id INTEGER REFERENCES backlog(id) ON DELETE CASCADE,
      tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (backlog_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- DD-284 (M3-S02 T07): Project-Home ToDo-Liste (Migration 037). project_todos
    -- ZUERST (todo_links referenziert via FK).
    -- MEM-16 (Migration 043): SSTD-Slots. GET /api/projects/:id/sstd reassembliert
    -- aus project_sstd_slots; fehlt die Tabelle -> "no such table" -> SSTD-Fetch 500
    -- -> Project-Home/Overview blockiert (t07/t09). Schema verbatim aus 043.
    CREATE TABLE IF NOT EXISTS project_sstd_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      slot_key TEXT NOT NULL CHECK (slot_key IN (
        'architecture', 'conventions', 'sprint_state', 'roadmap', 'cross_refs', 'misc'
      )),
      content TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (project_id, slot_key)
    );
    CREATE INDEX IF NOT EXISTS idx_project_sstd_slots_project ON project_sstd_slots(project_id);

    CREATE TABLE IF NOT EXISTS project_todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      details TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'done', 'cancelled')),
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS todo_links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      todo_id INTEGER NOT NULL REFERENCES project_todos(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('spec', 'issue', 'vault', 'url')),
      target TEXT NOT NULL,
      position INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Projekt 2 = devd (Dogfooding) — matched localStorage devd-active-project-id=2
  db.prepare(`
    INSERT OR IGNORE INTO projects (id, slug, name, prefix)
    VALUES (?, ?, ?, ?)
  `).run(2, 'devd', 'DevD', 'DD')

  // Milestone 1
  db.prepare(`
    INSERT OR IGNORE INTO milestones (id, project_id, name, description, target_date, status, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(1, 2, 'Roadmap V2 — Sprint Board Polish', 'DD-267 E2E-Test-Milestone', '2026-12-31', 'open', 1)

  // DD-407: m02-s02-Milestone-Fixtures (Alpha/Beta/Gamma/Auto) + DoD-Items.
  // target_date relativ zu heute → Timeline-Range (3M/12M) + Backfill-Banner
  // (T11: target_date == created_at + 90 Tage) greifen deterministisch.
  const isoDay = (offset) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toISOString().slice(0, 10)
  }
  const insertMs = db.prepare(`
    INSERT OR IGNORE INTO milestones (id, project_id, name, description, target_date, status, position)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  // Status-Vokabular: API-open-Filter = status IN ('planning','active') (DD-306).
  // Alpha/Beta/Auto = 'active' (im open-Filter sichtbar); Gamma = 'reached'
  // (alt-Vokabular: vom open-Filter ausgeblendet, im all-Filter sichtbar, rendert
  // milestone-status-reached-Badge — df-238).
  insertMs.run(2, 2, 'E2E-M-Alpha', 'Active, +30d, mit DoD', isoDay(30), 'active', 2)
  insertMs.run(3, 2, 'E2E-M-Beta', 'Active, +180d', isoDay(180), 'active', 3)
  insertMs.run(4, 2, 'E2E-M-Gamma', 'Reached (offen-Filter blendet aus)', isoDay(-30), 'reached', 4)
  insertMs.run(5, 2, 'E2E-M-Auto', 'Auto-Backfill: target_date = created+90d', isoDay(90), 'active', 5)

  // DoD-Seed fuer E2E-M-Alpha (>=3 Items, gemischter done-Status) — T09 + T08-Count.
  const insertDod = db.prepare(`
    INSERT OR IGNORE INTO milestone_dod_items (id, milestone_id, label, done, position)
    VALUES (?, ?, ?, ?, ?)
  `)
  insertDod.run(401, 2, 'E2E DoD offen 1', 0, 1)
  insertDod.run(402, 2, 'E2E DoD erledigt', 1, 2)
  insertDod.run(403, 2, 'E2E DoD offen 2', 0, 3)

  // Sprint DD#34 in Status 'planning', milestone_id = 1
  db.prepare(`
    INSERT OR IGNORE INTO sprints (
      id, project_id, project_number, name, status, milestone_id, position
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(101, 2, 34, 'Pill Smoke', 'planning', 1, 1)

  // DD-271: drei Tag-Seeds fuer das Tag-Picker-Pfeiltasten-Spec.
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO tags (id, project_id, name, color) VALUES (?, ?, ?, ?)
  `)
  insertTag.run(1, 2, 'ux-polish', 'blue')
  insertTag.run(2, 2, 'ux-roadmap', 'green')
  insertTag.run(3, 2, 'ux-deferred', 'mauve')

  // DD-284 (M3-S02 T07): Backlog-Issue für issue-pill→navigate(/issues/:id)-Test.
  // Key = DD-999 (prefix DD + project_number 999). Klick auf Issue-Pille im ToDo
  // löst Key→id über GET /api/backlog auf → navigate /issues/900.
  db.prepare(`
    INSERT OR IGNORE INTO backlog (id, project_id, project_number, title, type, status, priority)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(900, 2, 999, 'E2E Linked Issue', 'feature', 'new', 2)

  // Frontend-Rework Plan 04 Task 0: Charakterisierungs-Fixtures fuer Backlog-e2e.
  // Status-Varianz (new/refined/planned) macht Default-Filter (new+refined) und
  // Filter-Toggle testbar; 903 ist unzugewiesen → Drag-auf-Sprint-Chip-Netz.
  const insertBacklog = db.prepare(`
    INSERT OR IGNORE INTO backlog (id, project_id, project_number, title, type, status, priority, assigned_sprint)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertBacklog.run(901, 2, 901, 'E2E Refined Issue', 'feature', 'refined', 2, null)
  insertBacklog.run(902, 2, 902, 'E2E Planned Issue', 'task', 'planned', 1, null)
  insertBacklog.run(903, 2, 903, 'E2E New Draggable', 'feature', 'new', 2, null)
  // Frontend-Rework Plan 04 Task 4 (RoadmapBoard): 904 in Sprint 101 (Spalte
  // nicht-leer + Metriken), 905 cancelled (Storniert-Spalte mit Collapse).
  insertBacklog.run(904, 2, 904, 'E2E Sprint Issue', 'feature', 'planned', 2, 101)
  insertBacklog.run(905, 2, 905, 'E2E Cancelled Issue', 'task', 'cancelled', 3, null)

  // DD-284: 3 Seed-ToDos (Spec-Fixture). #701 offen mit Issue-Link DD-999,
  // #702 offen, #703 erledigt (done) — deckt Status-Varianten für Mockup-Optik ab.
  const insertTodo = db.prepare(`
    INSERT OR IGNORE INTO project_todos (id, project_id, label, status, position)
    VALUES (?, ?, ?, ?, ?)
  `)
  insertTodo.run(701, 2, 'E2E Layout-Port abnehmen', 'open', 1)
  insertTodo.run(702, 2, 'Mockup-Fidelity prüfen', 'open', 2)
  insertTodo.run(703, 2, 'Sidebar-Collapse testen', 'done', 3)

  // Issue-Link auf ToDo #701 → DD-999 (klickbare Pille).
  db.prepare(`
    INSERT OR IGNORE INTO todo_links (id, todo_id, type, target, position)
    VALUES (?, ?, ?, ?, ?)
  `).run(801, 701, 'issue', 'DD-999', 1)

  // Frontend-Rework Plan 04 Task 2: project_memories (Migration 041 + 042) fuer
  // Memory-View-e2e. Tabelle + FTS5-External-Content + Sync-Trigger gespiegelt,
  // damit GET /api/project-memories (List) UND /search (FTS5 MATCH) laufen.
  db.exec(`
    CREATE TABLE IF NOT EXISTS project_memories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      category TEXT NOT NULL CHECK (category IN (
        'architecture_decision','dead_end','bug_pattern','convention','external_constraint','session_note'
      )),
      summary TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      tags TEXT NOT NULL DEFAULT '',
      importance INTEGER NOT NULL DEFAULT 2 CHECK (importance BETWEEN 1 AND 3),
      pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
      source_type TEXT,
      source_ref TEXT,
      superseded_by INTEGER REFERENCES project_memories(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      anchor TEXT,
      stability TEXT NOT NULL DEFAULT 'volatile'
    );
    CREATE INDEX IF NOT EXISTS idx_project_memories_project ON project_memories(project_id);
    CREATE VIRTUAL TABLE IF NOT EXISTS project_memories_fts USING fts5(
      summary, content, tags,
      content='project_memories', content_rowid='id', tokenize='unicode61'
    );
    CREATE TRIGGER IF NOT EXISTS project_memories_ai AFTER INSERT ON project_memories BEGIN
      INSERT INTO project_memories_fts(rowid, summary, content, tags)
      VALUES (new.id, new.summary, new.content, new.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS project_memories_ad AFTER DELETE ON project_memories BEGIN
      INSERT INTO project_memories_fts(project_memories_fts, rowid, summary, content, tags)
      VALUES ('delete', old.id, old.summary, old.content, old.tags);
    END;
    CREATE TRIGGER IF NOT EXISTS project_memories_au AFTER UPDATE ON project_memories BEGIN
      INSERT INTO project_memories_fts(project_memories_fts, rowid, summary, content, tags)
      VALUES ('delete', old.id, old.summary, old.content, old.tags);
      INSERT INTO project_memories_fts(rowid, summary, content, tags)
      VALUES (new.id, new.summary, new.content, new.tags);
    END;
  `)

  // 3 Memory-Seeds (Kategorie- + Stabilitaets-Varianz). INSERT-Trigger fuellt FTS5.
  const insertMem = db.prepare(`
    INSERT OR IGNORE INTO project_memories
      (id, project_id, category, summary, content, tags, importance, stability, anchor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  insertMem.run(601, 2, 'architecture_decision', 'Layout-Primitives statt inline-flex', 'Stack/Cluster/Grid eingefuehrt.', 'layout primitives', 1, 'stable', 'D01')
  insertMem.run(602, 2, 'convention', 'Hex nur mit hex-ok-Marker', 'no-raw-hex Guard erzwingt Token.', 'hex guard', 2, 'stable', null)
  insertMem.run(603, 2, 'session_note', 'E2E-Fundament Backlog gebaut', 'Charakterisierungs-Netz vor Recompose.', 'e2e backlog', 3, 'volatile', null)

  // Frontend-Rework Plan 04 Task 3: ItemDetail-Tabs (Route /devd/issues/900).
  //  - subtasks (Migration 035): Sub-Tasks-Tab.
  //  - review_feedback VOLL (Migration 015: round_number + review_status) — api.js
  //    boot-DDL ist minimal und wuerde den Reviews-Endpoint (ORDER BY round_number)
  //    mit "no such column" brechen; darum hier mit vollem Schema vorab anlegen.
  //  - issue_dependencies (Basis-Schema, von keiner Migration erzeugt): Deps-Sektion.
  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      qa_criteria TEXT,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
      position INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );
    CREATE INDEX IF NOT EXISTS idx_subtasks_backlog ON subtasks(backlog_id);

    CREATE TABLE IF NOT EXISTS review_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backlog_id INTEGER NOT NULL REFERENCES backlog(id),
      status TEXT NOT NULL DEFAULT 'pending',
      comment TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      round_number INTEGER NOT NULL DEFAULT 1,
      review_status TEXT NOT NULL DEFAULT 'pending'
    );
    CREATE INDEX IF NOT EXISTS idx_review_feedback_backlog ON review_feedback(backlog_id);
    CREATE INDEX IF NOT EXISTS idx_review_feedback_backlog_round ON review_feedback(backlog_id, round_number);

    CREATE TABLE IF NOT EXISTS issue_dependencies (
      id INTEGER PRIMARY KEY,
      issue_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
      depends_on_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(issue_id, depends_on_id),
      CHECK(issue_id != depends_on_id)
    );
    CREATE INDEX IF NOT EXISTS idx_deps_issue ON issue_dependencies(issue_id);
    CREATE INDEX IF NOT EXISTS idx_deps_depends ON issue_dependencies(depends_on_id);

    -- Legacy 'tasks' (Basis-Schema) + 'backlog_attachments' (Migration 005):
    -- GET /api/backlog/:id selektiert beide. Fehlen sie, wirft der Single-Item-
    -- Endpoint "no such table" → 500 → ItemDetail rendert leeres Item.
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY,
      backlog_id INTEGER REFERENCES backlog(id),
      sprint_id INTEGER REFERENCES sprints(id),
      title TEXT NOT NULL,
      assignee TEXT,
      status TEXT DEFAULT 'todo',
      effort INTEGER,
      started_at DATETIME,
      completed_at DATETIME,
      validation_output TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS backlog_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backlog_id INTEGER NOT NULL REFERENCES backlog(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      mime_type TEXT,
      caption TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_backlog_attachments_backlog ON backlog_attachments(backlog_id);
  `)

  // Tab-Fixtures fuer Issue 900: 2 Sub-Tasks (open/done), 1 Review-Runde (notes
  // sichtbar im Reviews-Tab), 2 Audit-Eintraege (Activity-Tab), 1 Dependency.
  const insertSubtask = db.prepare(`
    INSERT OR IGNORE INTO subtasks (id, backlog_id, title, qa_criteria, status, position)
    VALUES (?, ?, ?, ?, ?, ?)
  `)
  insertSubtask.run(920, 900, 'E2E Subtask Open', 'Pruefen dass offen rendert', 'open', 0)
  insertSubtask.run(921, 900, 'E2E Subtask Done', 'erledigt', 'done', 1)

  db.prepare(`
    INSERT OR IGNORE INTO review_feedback
      (id, backlog_id, status, comment, notes, round_number, review_status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(930, 900, 'pending', 'E2E Review Comment', 'E2E Review Note', 1, 'in_progress')

  const insertAudit = db.prepare(`
    INSERT OR IGNORE INTO audit_log (id, agent_id, action, table_name, record_id)
    VALUES (?, ?, ?, ?, ?)
  `)
  insertAudit.run(940, 'e2e', 'create', 'backlog', 900)
  insertAudit.run(941, 'claude-e2e', 'edit', 'backlog', 900)

  db.prepare(`
    INSERT OR IGNORE INTO issue_dependencies (id, issue_id, depends_on_id, note)
    VALUES (?, ?, ?, ?)
  `).run(950, 900, 901, 'E2E Dep')

  db.close()
  console.log('[dd267:setup] DB ready — sprint DD#34 → milestone M1 (id=1) + 3 tags + 3 todos (DD-284)')
}
