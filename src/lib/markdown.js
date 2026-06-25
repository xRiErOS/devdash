// Minimal Markdown-Renderer ohne Dependencies. Übernommen aus MyBaby.
// Unterstützt: **bold**, *italic*, `code`, ``` Code-Blöcke, # H1–H6, - Listen,
// - [ ] / - [x] Task-Listen (read-only Render), GFM-Tabellen, [text](url)-Links,
// > Blockquotes, --- Horizontal-Rules, Leerzeile = Absatz.

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// DD-362: erlaubte URL-Schemes für Links. Verhindert javascript:/data: etc.
// Hinweis: Die URL ist hier bereits HTML-escaped (z.B. `&` → `&amp;`), das ist
// für href ok. Wir prüfen das Schema vor dem Escape-Effekt — relative Pfade,
// Anchors (#), sowie http(s):, mailto: und obsidian: sind erlaubt.
function isSafeUrl(url) {
  const u = url.trim()
  if (u.startsWith('#') || u.startsWith('/')) return true
  if (/^(https?|mailto|obsidian):/i.test(u)) return true
  // relative Pfade ohne Scheme (kein `:` vor erstem `/`, `?`, `#`)
  const schemeMatch = u.match(/^([a-z][a-z0-9+.-]*):/i)
  if (!schemeMatch) return true
  return false
}

function renderInline(text) {
  let out = escapeHtml(text)
  // DD-362: Links VOR bold/italic, damit URL-Inhalt nicht als Markup verändert wird.
  // Arbeitet auf dem bereits escapten String (& ist hier ggf. &amp;).
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => {
    if (!isSafeUrl(url)) return match
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:var(--blue);text-decoration:underline">${label}</a>`
  })
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>')
  out = out.replace(
    /`([^`]+)`/g,
    '<code style="background:var(--surface1);padding:0 4px;border-radius:3px;font-size:0.85em;font-family:var(--font-mono,ui-monospace,monospace);overflow-wrap:anywhere;word-break:break-word">$1</code>'
  )
  return out
}

// DD-362: Prüft, ob eine Zeile eine GFM-Tabellen-Separator-Zeile ist.
// Nur `|`, `-`, `:`, Whitespace erlaubt, mindestens ein `-`.
function isTableSeparator(line) {
  const t = line.trim()
  if (!t.includes('-')) return false
  if (!/^\|?[\s:|-]+\|?$/.test(t)) return false
  // mindestens eine Zelle mit Dashes
  const cells = splitTableRow(t)
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c.trim()))
}

// DD-362: Splittet eine Tabellenzeile in Zellen (umgebende Pipes entfernt).
function splitTableRow(line) {
  let t = line.trim()
  if (t.startsWith('|')) t = t.slice(1)
  if (t.endsWith('|')) t = t.slice(0, -1)
  return t.split('|')
}

// DD-362: Alignment aus einer Separator-Zelle ableiten.
function cellAlign(sepCell) {
  const c = sepCell.trim()
  const left = c.startsWith(':')
  const right = c.endsWith(':')
  if (left && right) return 'center'
  if (right) return 'right'
  if (left) return 'left'
  return null
}

export function renderMarkdown(md) {
  if (!md) return ''
  const lines = String(md).split('\n')
  const html = []
  let inCodeBlock = false
  let listType = null // 'ul' | 'ol' | null

  const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = null } }

  // DD-125: Bullets/Nummern als neutrale Marker (subtext0), nicht peach.
  // li-marker-color via ::marker color inheriting from li.
  const ulStyle = 'list-style:disc;padding-left:1.25rem;margin:4px 0;color:var(--text);font-size:0.9em'
  const olStyle = 'list-style:decimal;padding-left:1.4rem;margin:4px 0;color:var(--text);font-size:0.9em'
  const liStyle = 'margin:1px 0'

  // DD-362: Tabellen-Styles (Catppuccin-Tokens).
  const tableStyle = 'border-collapse:collapse;margin:6px 0;font-size:0.85em;color:var(--text)'
  const thStyle = 'border:1px solid var(--surface1);padding:4px 8px;font-weight:700'
  const tdStyle = 'border:1px solid var(--surface1);padding:4px 8px'

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.trimStart().startsWith('```')) {
      closeList()
      if (inCodeBlock) { html.push('</code></pre>'); inCodeBlock = false }
      else {
        html.push('<pre style="background:var(--surface1);border-radius:8px;padding:8px 10px;margin:6px 0;overflow-x:auto;max-width:100%"><code style="font-family:var(--font-mono,ui-monospace,monospace);font-size:0.85em;color:var(--text)">')
        inCodeBlock = true
      }
      continue
    }
    if (inCodeBlock) { html.push(escapeHtml(line) + '\n'); continue }

    // DD-362: GFM-Tabelle — Header-Zeile (enthält `|`) gefolgt von Separator-Zeile.
    const trimmed = line.trim()
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      closeList()
      const headerCells = splitTableRow(trimmed)
      const sepCells = splitTableRow(lines[i + 1].trim())
      const aligns = sepCells.map(cellAlign)
      const alignStyle = (idx) => {
        const a = aligns[idx]
        return a ? `;text-align:${a}` : ''
      }
      html.push(`<table style="${tableStyle}">`)
      html.push('<thead><tr>')
      headerCells.forEach((cell, idx) => {
        html.push(`<th style="${thStyle}${alignStyle(idx)}">${renderInline(cell.trim())}</th>`)
      })
      html.push('</tr></thead>')
      html.push('<tbody>')
      let j = i + 2
      while (j < lines.length) {
        const rowLine = lines[j]
        const rowTrim = rowLine.trim()
        if (rowTrim === '' || !rowTrim.includes('|')) break
        const cells = splitTableRow(rowTrim)
        html.push('<tr>')
        cells.forEach((cell, idx) => {
          html.push(`<td style="${tdStyle}${alignStyle(idx)}">${renderInline(cell.trim())}</td>`)
        })
        html.push('</tr>')
        j++
      }
      html.push('</tbody></table>')
      i = j - 1
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      const sizes = { 1: '1.15rem', 2: '1.05rem', 3: '0.95rem', 4: '0.9rem', 5: '0.85rem', 6: '0.8rem' }
      const color = level >= 5 ? 'var(--subtext1)' : 'var(--text)'
      html.push(
        `<h${level} style="font-weight:700;color:${color};margin:8px 0 2px;font-size:${sizes[level]}">${renderInline(heading[2])}</h${level}>`
      )
      continue
    }

    // DD-362: Horizontal-Rule — isolierte Zeile nur aus ---, *** oder ___.
    // (Tabellen-Separatoren werden oben schon abgefangen, Headings sind ATX.)
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeList()
      html.push('<hr style="border:0;border-top:1px solid var(--surface1);margin:10px 0" />')
      continue
    }

    // DD-362: Blockquote — aufeinanderfolgende `>`-Zeilen zusammenfassen.
    if (/^\s*>/.test(line)) {
      closeList()
      const quoteLines = []
      let j = i
      while (j < lines.length && /^\s*>/.test(lines[j])) {
        quoteLines.push(lines[j].replace(/^\s*>\s?/, ''))
        j++
      }
      const inner = quoteLines.map((q) => renderInline(q)).join('<br />')
      html.push(
        `<blockquote style="border-left:3px solid var(--surface2);padding-left:10px;margin:6px 0;color:var(--subtext1)">${inner}</blockquote>`
      )
      i = j - 1
      continue
    }

    const task = line.match(/^[\s]*[-*]\s*\[( |x|X)?\]\s*(.+)$/)
    if (task) {
      if (listType !== 'ul-task') { closeList(); html.push('<ul style="list-style:none;padding-left:0;margin:4px 0">'); listType = 'ul-task' }
      const checked = (task[1] ?? '').toLowerCase() === 'x'
      const txt = renderInline(task[2])
      html.push(
        `<li style="display:flex;gap:6px;align-items:flex-start;font-size:0.9em;color:var(--text)">` +
        `<input type="checkbox" disabled ${checked ? 'checked' : ''} style="margin-top:3px;accent-color:var(--green)" />` +
        `<span style="${checked ? 'text-decoration:line-through;color:var(--subtext0)' : ''}">${txt}</span>` +
        `</li>`
      )
      continue
    }

    const ordered = line.match(/^[\s]*\d+\.\s+(.+)$/)
    if (ordered) {
      if (listType !== 'ol') { closeList(); html.push(`<ol style="${olStyle}">`); listType = 'ol' }
      html.push(`<li style="${liStyle}">${renderInline(ordered[1])}</li>`)
      continue
    }

    const item = line.match(/^[\s]*[-*]\s+(.+)$/)
    if (item) {
      if (listType !== 'ul') { closeList(); html.push(`<ul style="${ulStyle}">`); listType = 'ul' }
      html.push(`<li style="${liStyle}">${renderInline(item[1])}</li>`)
      continue
    }
    closeList()

    if (line.trim() === '') { html.push('<div style="height:6px"></div>'); continue }
    html.push(`<p style="font-size:0.9em;color:var(--text);margin:2px 0;line-height:1.5">${renderInline(line)}</p>`)
  }
  closeList()
  if (inCodeBlock) html.push('</code></pre>')
  return html.join('')
}
