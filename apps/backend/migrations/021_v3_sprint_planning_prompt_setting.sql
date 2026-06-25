-- DD-83 R2: Sprint-Planungs-Prompt als editierbares Setting in settings-Tabelle.
-- Wenn Wert gesetzt, hat Vorrang vor config/sprint-planning-prompt.md.
INSERT OR IGNORE INTO settings (key, value, description, is_secret)
VALUES (
  'sprint_planning_prompt',
  NULL,
  'Markdown-Template für Sprint-Planungs-Prompt. Platzhalter: {{project_name}}, {{capacity_hint}}, {{issue_count}}, {{issues_list}}, {{project_context_block}}, {{dynamic_files_block}}',
  0
);
