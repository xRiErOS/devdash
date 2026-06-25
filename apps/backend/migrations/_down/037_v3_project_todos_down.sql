-- DD-278 (M3-S01 T01) Down-Migration: todo_links zuerst (FK), dann project_todos.

DROP INDEX IF EXISTS idx_todo_links_todo;
DROP TABLE IF EXISTS todo_links;

DROP INDEX IF EXISTS idx_project_todos_open;
DROP INDEX IF EXISTS idx_project_todos_project;
DROP TABLE IF EXISTS project_todos;
