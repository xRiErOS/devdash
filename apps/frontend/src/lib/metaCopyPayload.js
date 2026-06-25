// DD-676 — Build the clipboard payload for the Project-Home Meta-Card
// "Projekt-Meta-Kopieren" action (data-ui project-home.meta.copy). Emits ONLY
// the project Stammdaten (id, slug, name, prefix, repo) plus MCP-Abruf hints
// for NSP / Session-Notes / letzte Memories. Deliberately NOT the SSTD slot
// contents — that dump was too large and not useful for the handoff (ersetzt
// das DD-493-Verhalten). Pure + deterministic → unit-testable.

/**
 * @param {object} project - { id, slug, name, prefix, repo_path }
 * @returns {string} markdown block: meta heading + Stammdaten + MCP-Abruf hints.
 */
export function buildMetaCopyPayload(project = {}) {
  const ref = project.slug || (project.id != null ? String(project.id) : null)

  const metaLines = [
    `# ${project.name ?? 'Projekt'} — AI-Handoff`,
    '',
    '## Projekt-Meta',
    project.id != null ? `- ID: ${project.id}` : null,
    project.slug ? `- Slug: ${project.slug}` : null,
    project.name ? `- Name: ${project.name}` : null,
    project.prefix ? `- Präfix: ${project.prefix}` : null,
    project.repo_path ? `- Repo: ${project.repo_path}` : null,
  ].filter(Boolean)

  // MCP-Abruf-Hinweise: wie ein Agent NSP / Session-Notes / letzte Memories
  // zieht. Braucht eine Projekt-Referenz (Slug bevorzugt, sonst numerische id).
  const mcpLines = ref
    ? [
        '',
        '## MCP-Abruf (NSP / Session-Notes / Memories)',
        `- SSTD + Roadmap/NSP: devd_sstd_get { id_or_slug: "${ref}" }`,
        `- Session-Notes (Journal): devd_project_memory_query { project_id: "${ref}", category: "session_note" }`,
        `- Letzte Memories: devd_project_memory_query { project_id: "${ref}", q: "<Suchbegriff>" }`,
        `- CLI: devd-cli sstd show ${ref}`,
      ]
    : []

  return [...metaLines, ...mcpLines].join('\n')
}
