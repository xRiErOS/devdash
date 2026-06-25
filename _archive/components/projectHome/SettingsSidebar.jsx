// DD-282 R4 (M3-S02 T02): SettingsSidebar 1:1 aus DD39-Mockup-v2 (.pane-side Z.1081-1158).
// Vier .card-Sektionen (Reihenfolge Meta → ToDo-Preview → Dependency → Quick-Settings),
// je mit .card-h (Icon-wrap 24x24 + h3 Mono 13/700). Card = mantle-bg, surface0-border,
// radius 10, pad 16, shadow-card. DD-339 R5: Meta zeigt DB-ID + Copy-Icon (ohne Color),
// ToDo-Preview live aus useProjectTodos (Top 5 offen); Dependency bleibt read-only Platzhalter.

import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useProjectTodos } from '../../hooks/useProjectTodos.js'

const card = {
  background: 'var(--mantle)',
  border: '1px solid var(--surface0)',
  borderRadius: 10,
  padding: 'var(--space-4, 16px)',
  boxShadow: 'var(--shadow-card)',
  position: 'relative',
}

const cardHead = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2, 8px)',
  marginBottom: 'var(--space-3, 12px)',
}

const iconWrap = {
  width: 24,
  height: 24,
  borderRadius: 6,
  background: 'var(--surface0)',
  display: 'grid',
  placeItems: 'center',
  color: 'var(--subtext0)',
  flexShrink: 0,
}

const cardTitle = {
  margin: 0,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--text)',
  fontFamily: 'var(--font-display, system-ui)',
}

const cardMeta = {
  marginLeft: 'auto',
  fontSize: 11,
  color: 'var(--subtext0)',
  fontFamily: 'var(--font-display, system-ui)',
}

const placeholderText = {
  margin: 0,
  fontSize: 12,
  color: 'var(--subtext0)',
  lineHeight: 1.5,
  fontFamily: 'var(--font-display, system-ui)',
}

function Ico({ children }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  )
}

function CardHead({ icon, title, meta, slug }) {
  return (
    <div style={cardHead} data-ui={slug}>
      <span style={iconWrap}><Ico>{icon}</Ico></span>
      <h3 style={cardTitle}>{title}</h3>
      {meta && <span style={cardMeta}>{meta}</span>}
    </div>
  )
}

function MetaRow({ k, v, dot }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: 'var(--subtext0)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</span>
      <span style={{ fontSize: 12, color: 'var(--text)', display: 'inline-flex', alignItems: 'center', gap: 6, wordBreak: 'break-word' }}>
        {dot && <span style={{ width: 10, height: 10, borderRadius: '50%', background: dot, flexShrink: 0 }} />}
        {v}
      </span>
    </div>
  )
}

const copyBtn = {
  position: 'absolute',
  top: 12,
  right: 12,
  width: 26,
  height: 26,
  borderRadius: 6,
  background: 'transparent',
  border: '1px solid var(--surface0)',
  color: 'var(--subtext0)',
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  padding: 0,
}

const previewItem = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 12,
  color: 'var(--text)',
  fontFamily: 'var(--font-display, system-ui)',
}

// B01/B02/I01 (DD-339): Meta-Card mit DB-ID-Zeile, ohne Color-Eintrag, Copy-Icon oben rechts.
function MetaCard({ projectName, slug, prefix, id }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    const text = [
      id != null && `ID: ${id}`,
      `Name: ${projectName || '—'}`,
      slug && `Slug: ${slug}`,
      prefix && `Prefix: ${prefix}`,
    ].filter(Boolean).join('\n')
    try {
      await navigator.clipboard?.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* Clipboard nicht verfügbar */ }
  }
  return (
    <section style={card} data-ui="project-home.sidebar.meta">
      <CardHead
        slug="project-home.sidebar.meta.head"
        title="Projekt-Meta"
        icon={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>}
      />
      <button
        type="button"
        onClick={handleCopy}
        data-ui="project-home.sidebar.meta.copy"
        aria-label="Projekt-Meta kopieren"
        title={copied ? 'Kopiert' : 'Kopieren'}
        style={copyBtn}
      >
        {copied
          ? <Ico><polyline points="20 6 9 17 4 12" /></Ico>
          : <Ico><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Ico>}
      </button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'var(--font-display, system-ui)' }}>
        {id != null && <MetaRow k="ID" v={String(id)} />}
        <MetaRow k="Name" v={projectName || '—'} />
        {slug && <MetaRow k="Slug" v={slug} />}
        {prefix && <MetaRow k="Prefix" v={prefix} />}
      </div>
    </section>
  )
}

// B03 (DD-339): ToDo-Preview speist sich live aus useProjectTodos (Top 5 offene).
function TodoPreviewSection({ projectId }) {
  const { todos, loading } = useProjectTodos(projectId)
  const open = todos.filter((t) => t.status === 'open').slice(0, 5)
  return (
    <section style={card} data-ui="project-home.sidebar.todo-preview">
      <CardHead
        slug="project-home.sidebar.todo-preview.head"
        title="ToDos · Top 5"
        meta="ToDo-Tab"
        icon={<><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>}
      />
      {open.length === 0 ? (
        <p style={placeholderText}>{loading ? 'Lädt …' : 'Keine offenen ToDos.'}</p>
      ) : (
        <ul data-ui="project-home.sidebar.todo-preview.list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {open.map((t) => (
            <li key={t.id} data-ui={`project-home.sidebar.todo-preview.item.${t.id}`} style={previewItem}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--peach)', flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function SettingsSidebar({ collapsed, projectName, project }) {
  const { slug: routeSlug } = useParams() // DD-368: Projekt-Settings ist /:slug/settings
  if (collapsed) {
    return (
      <aside
        data-ui="project-home.sidebar"
        aria-label="Project-Sidebar (eingeklappt)"
        style={{
          width: 48,
          minHeight: 0,
          padding: '12px 0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
          color: 'var(--subtext0)',
          fontSize: 10,
          fontFamily: 'var(--font-display, system-ui)',
          writingMode: 'vertical-rl',
          textOrientation: 'mixed',
        }}
      >
        <span style={{ transform: 'rotate(180deg)' }}>{projectName || 'Project'}</span>
      </aside>
    )
  }

  const slug = project?.slug || (projectName ? projectName.toLowerCase() : '')
  const prefix = project?.prefix

  return (
    <aside
      data-ui="project-home.sidebar"
      aria-label="Project-Sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4, 16px)',
        minHeight: 0,
        overflowY: 'auto',
      }}
    >
      {/* 1 — Meta (echte Projektdaten inkl. DB-ID + Copy-Icon) */}
      <MetaCard projectName={projectName} slug={slug} prefix={prefix} id={project?.id} />

      {/* 2 — ToDo-Preview (Top 5 offene, live aus useProjectTodos) */}
      <TodoPreviewSection projectId={project?.id} />

      {/* 3 — Dependency-Chain (Card-Shell, Daten-Slice folgt) */}
      <section style={card} data-ui="project-home.sidebar.dependency">
        <CardHead
          slug="project-home.sidebar.dependency.head"
          title="Dependency-Chain"
          meta="Klick → Milestone"
          icon={<><line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M18 9a9 9 0 0 1-9 9" /></>}
        />
        <p style={placeholderText}>Milestone-Abhängigkeiten erscheinen hier als verkettete Nodes.</p>
      </section>

      {/* 4 — Quick-Settings */}
      <section style={card} data-ui="project-home.sidebar.quick-settings">
        <CardHead
          slug="project-home.sidebar.quick-settings.head"
          title="Quick-Settings"
          icon={<><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>}
        />
        <Link
          to={(routeSlug || slug) ? `/${routeSlug || slug}/settings` : '/settings'}
          data-ui="project-home.sidebar.quick-settings.full"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--surface0)',
            borderRadius: 6,
            padding: '6px 10px',
            fontSize: 11,
            fontFamily: 'var(--font-display, system-ui)',
            color: 'var(--subtext0)',
            textDecoration: 'none',
          }}
        >
          Edit full project settings →
        </Link>
      </section>
    </aside>
  )
}
