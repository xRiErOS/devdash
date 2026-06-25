-- DD-143 + DD-84: Projekt-Pfade (Repo, Docs, Context-File) als Settings
ALTER TABLE projects ADD COLUMN repo_path TEXT;
ALTER TABLE projects ADD COLUMN docs_path TEXT;
ALTER TABLE projects ADD COLUMN context_file_path TEXT;
