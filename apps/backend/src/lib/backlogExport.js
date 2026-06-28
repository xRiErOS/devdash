// DD2-123 — Backlog-Export-Serializer. Pure, ohne Express/DB. LLM-taugliche
// Formate: md (default) | json | yaml. csv wurde entfernt (schlecht für LLM-Parsing);
// unbekannte Formate fallen auf md zurück. Items kommen angereichert rein (tags[] gesetzt).
import { stringify as yamlStringify } from 'yaml'

function itemKey(it) {
  return it.prefix && it.project_number ? `${it.prefix}-${it.project_number}` : `#${it.id}`
}

// Strukturierter Record für json/yaml.
function toRecord(it) {
  return {
    id: it.id,
    key: itemKey(it),
    title: it.title,
    status: it.status,
    type: it.type,
    priority: it.priority,
    sprint: it.sprint_name || null,
    milestone: it.milestone || null,
    tags: Array.isArray(it.tags) ? it.tags : [],
    created_at: it.created_at || null,
    completed_at: it.completed_at || null,
  }
}

function toMarkdown(items) {
  const md = [`# Backlog`, '', `**Items:** ${items.length}  `, `**Stand:** ${new Date().toISOString().slice(0, 10)}`, '']
  for (const it of items) {
    const key = itemKey(it)
    const tags = Array.isArray(it.tags) ? it.tags : []
    const tagSuffix = tags.length ? ` · _${tags.join(', ')}_` : ''
    md.push(`- **[${key}] ${it.title}** — ${it.status} · P${it.priority} · ${it.type}${it.sprint_name ? ` · ${it.sprint_name}` : ''}${tagSuffix}`)
  }
  return md.join('\n')
}

// Liefert { body, contentType, ext } für den gewünschten Export. Default + Fallback = md.
export function serializeBacklog(items = [], format) {
  const fmt = String(format || 'md').toLowerCase()
  if (fmt === 'json') {
    return {
      body: JSON.stringify(items.map(toRecord), null, 2),
      contentType: 'application/json; charset=utf-8',
      ext: 'json',
    }
  }
  if (fmt === 'yaml' || fmt === 'yml') {
    return {
      body: yamlStringify(items.map(toRecord)),
      contentType: 'text/yaml; charset=utf-8',
      ext: 'yaml',
    }
  }
  return {
    body: toMarkdown(items),
    contentType: 'text/markdown; charset=utf-8',
    ext: 'md',
  }
}
