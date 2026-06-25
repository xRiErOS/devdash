/**
 * TodoLinksList — kanonisches, token-sauberes Organism (DD-481 Harvest aus
 * src/components/projectHome/TodoLinksList.jsx).
 *
 * Domänen-bewusste Einheit: rendert die Liste verlinkter Dokumente eines Todos
 * (Typ-Icon-Farbe je Link-Typ, Label, Typ-Tag, Remove-Button). Issue-Links sind
 * klickbar → öffnen das Issue; obsidian://-Links werden als echte <a href> mit
 * lesbarem Note-Namen (file=-Param) gerendert. Komponiert die kanonischen
 * Bausteine ../atoms/TypeIcon.jsx (Typ-Farbe/Icon) + ../molecules/LinkRow.jsx
 * (eine Zeile: Icon + Label-Link + Typ-Tag + Remove).
 *
 * PRESENTATIONAL (D-Phase3-01): kein Store/Fetch/useEffect-Datenladen. Die
 * gehobene Kopplung gegenüber der Quelle:
 *  - Quelle nahm `links` schon als Prop, aber Mutation lief über `onRemove(id)`
 *    und Navigation über `onOpenIssue(key)`. Hier zu den expliziten Callback-Props
 *    `onRemoveLink(id)` und `onIssueClick(key)` umbenannt (klarere Semantik), die
 *    Komponente löst weder API noch Router selbst aus.
 *  - Der inline-`<svg>`-TypeIcon + die `TYPE_COLORS`/`TYPE_ICONS`-Maps der Quelle
 *    sind durch das Atom ../atoms/TypeIcon.jsx ersetzt (gleiche Typ→Farbe-Semantik:
 *    spec→warning/peach, issue→info/blue, vault→primary/mauve, url→success/green).
 *  - Die inline-style-LinkRow der Quelle ist durch ../molecules/LinkRow.jsx ersetzt
 *    (Icon + klickbares Label + Typ-Tag + Remove). Issue-/obsidian-Erkennung +
 *    Label-Ableitung (obsidian file=-Name, [[..]]-Wrap für vault) bleibt hier
 *    erhalten und steuert href/onClick der LinkRow.
 *  - `hover`-State der Quelle entfällt — Hover ist token-clean via Tailwind in
 *    LinkRow/TypeIcon abgebildet.
 *
 * Ephemerer UI-State: keiner nötig.
 *
 * @param {object} props
 * @param {Array<{id:number|string, type:string, target:string}>} [props.links] - Link-Datensätze
 * @param {(id:number|string)=>void} [props.onRemoveLink] - Remove-Klick → Link entfernen (gehoben)
 * @param {(key:string)=>void} [props.onIssueClick] - Klick auf Issue-Link → Issue öffnen (gehoben)
 * @param {string} [props.dataUiScope='todo-links-list'] - Wurzel-data-ui-bereich (I03/D01: parametrisiert)
 * @param {string} [props.className] - zusätzliche Klassen auf die <ul>
 */

import LinkRow from '../molecules/LinkRow.jsx'

// DD-340: extrahiert den decodierten `file=`-Note-Namen aus einer obsidian://-URL.
// Gibt null zurück, wenn kein (befüllter) file=-Param vorhanden ist → Fallback auf rohe URL.
function obsidianFileName(url) {
  const m = /[?&]file=([^&]*)/.exec(url)
  if (!m || !m[1]) return null
  try {
    return decodeURIComponent(m[1])
  } catch {
    return m[1]
  }
}

// DD-491: erkennt eine browser-öffenbare http(s)-URL (url-/file-Typ-Targets).
function isBrowserUrl(target) {
  return typeof target === 'string' && /^https?:\/\//i.test(target)
}

// Leitet aus einem Link-Datensatz die LinkRow-Props ab (Label, href, onRemove).
// obsidian://-Links → echter <a href> (Note-Name als Text); http(s)-URLs (url/file)
// → klickbarer <a href> im Browser; vault → [[..]]-gewrapptes Label. Der Issue-Klick
// wird nicht hier, sondern am umschließenden <li> delegiert.
function rowPropsFor(link, onRemoveLink) {
  const isObsidian = typeof link.target === 'string' && link.target.startsWith('obsidian://')
  const obsidianName = isObsidian ? obsidianFileName(link.target) : null

  let label = link.target
  if (obsidianName) label = obsidianName
  else if (link.type === 'vault') label = `[[${link.target}]]`

  const props = {
    type: link.type,
    label,
    onRemove: onRemoveLink ? () => onRemoveLink(link.id) : undefined,
  }

  if (isObsidian) {
    // obsidian://-Link klickbar — href bleibt die volle URI, Text = Note-Name.
    props.href = link.target
  } else if (link.type !== 'issue' && isBrowserUrl(link.target)) {
    // DD-491: url-/file-Links mit http(s)-Target sind im Browser klickbar.
    props.href = link.target
  }
  // Issue-Links: LinkRow rendert ein Label ohne href; der Klick wird am
  // umschließenden <li> via onClick delegiert (siehe render unten).
  return props
}

export default function TodoLinksList({
  links,
  onRemoveLink,
  onIssueClick,
  dataUiScope = 'todo-links-list',
  className = '',
}) {
  if (!links || links.length === 0) {
    return (
      <p
        data-ui={`${dataUiScope}.empty`}
        className="mt-1 mb-0 text-xs text-[var(--subtext0)] font-[var(--font-display,system-ui)]"
      >
        Keine verlinkten Dokumente.
      </p>
    )
  }

  return (
    <ul data-ui={dataUiScope} className={`list-none p-0 m-0 ${className}`}>
      {links.map((link) => {
        const isIssue = link.type === 'issue'
        const rowProps = rowPropsFor(link, onRemoveLink)
        const handleIssue = isIssue && onIssueClick ? () => onIssueClick(link.target) : undefined

        return (
          <li
            key={link.id}
            data-ui={`${dataUiScope}.item`}
            data-link-type={link.type}
            onClick={handleIssue}
            className={handleIssue ? 'cursor-pointer' : undefined}
          >
            <LinkRow {...rowProps} />
          </li>
        )
      })}
    </ul>
  )
}
