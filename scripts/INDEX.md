# INDEX — `scripts/`

> Generiert von `scripts/gen-index.mjs` — nicht von Hand editieren.
> Regenerieren: `npm run gen:index -- scripts`. Metadaten pflegen: `@index`-Block (Code) bzw. YAML-Frontmatter (`.md`).

| Titel | Beschreibung | Pfad |
|-------|--------------|------|
| apply-memory-tag-register | Wendet Seed/Merge/Prune auf das memory_tags-Register via NAS-REST-API an (--yes = real, MEM-25) | `scripts/apply-memory-tag-register.mjs` |
| gen-index | Generiert die INDEX.md-Manifest-Tabelle eines Buckets (scripts/, docs/) mit --check-Drift-Guard | `scripts/gen-index.mjs` |
| gen-mcp-notes | Generiert pro devd-MCP-Tool eine Obsidian-Note + Index via Zod-Introspektion | `scripts/gen-mcp-notes.mjs` |
| generate-pwa-icons | Erzeugt PWA-Icon-Set + apple-touch-icon aus public/favicon.svg (DD-226) | `scripts/generate-pwa-icons.mjs` |
| memory-tag-register.data | Daten — PO-freigegebenes Seed + Merge-Map für das memory_tags-Register (Single Source) | `scripts/memory-tag-register.data.mjs` |
| memory-trigger-match | UserPromptSubmit-Hook — matcht Prompt gegen memory-triggers.json, Signal-only (MEM-25) | `scripts/memory-trigger-match.mjs` |
| migrate | DevD Migration Runner — wendet *.sql idempotent via schema_migrations an | `scripts/migrate.js` |
| secret-scan | Secret-Scanner für staged changes; blockt hardcodierte Keys/Credentials (Bypass SKIP_SECRET_SCAN=1) | `scripts/secret-scan.sh` |
