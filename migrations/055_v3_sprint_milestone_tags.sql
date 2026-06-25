-- GF-2 Wave D / D1 (D-K): additive Tag-Junctions für Sprint + Milestone.
-- Mirror von backlog_tags (Migration 010) — eigene Junction je Entität gegen die
-- shared tags-Tabelle (project-scoped). KEIN Polymorph-Refactor, bricht keine
-- bestehenden Issue-Tag-Consumer. Tags selbst bleiben in `tags` (UNIQUE(project_id,name)).

CREATE TABLE IF NOT EXISTS sprint_tags (
  sprint_id INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (sprint_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_tags_sprint ON sprint_tags(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_tags_tag ON sprint_tags(tag_id);

CREATE TABLE IF NOT EXISTS milestone_tags (
  milestone_id INTEGER NOT NULL REFERENCES milestones(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (milestone_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_milestone_tags_milestone ON milestone_tags(milestone_id);
CREATE INDEX IF NOT EXISTS idx_milestone_tags_tag ON milestone_tags(tag_id);
