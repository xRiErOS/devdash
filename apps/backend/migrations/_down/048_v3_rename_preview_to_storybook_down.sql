-- DD-520 (reverse): storybook_url zurueck auf preview_base_url benennen.
ALTER TABLE projects RENAME COLUMN storybook_url TO preview_base_url;
