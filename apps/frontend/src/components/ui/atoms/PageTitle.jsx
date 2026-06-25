/**
 * PageTitle — DD-671 Atom. Kanonischer Screen-Title (das Page-`<h1>`), geharvestet
 * aus den divergenten Inline-Headings in ProjectHomeView / RoadmapBoard /
 * BacklogPage. Props-driven, presentational, kein Store/Fetch.
 *
 * Kanonische Größe: `text-2xl` (24px) + `font-bold`. Begründung — die drei
 * Bestands-Titel lagen bei 22px / text-xl (20px) / text-2xl (24px); text-2xl ist
 * der größte und liest am klarsten als oberster Seiten-Anker (DESIGN.md:
 * Hierarchie über Größe + Gewicht). Font = `font-display` (JetBrains Mono),
 * Farbe = `--text`, kein Außenabstand (`m-0`) — Spacing regelt der Konsument
 * via `className` (z.B. `pb-4`).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children - Titeltext/-Knoten
 * @param {import('react').ReactNode} [props.leadingIcon] - optionales Icon links (z.B. lucide-react-Element)
 * @param {import('react').ReactNode} [props.suffix] - optionaler gemuteter Suffix (z.B. ` · slug`)
 * @param {string} [props.dataTestid] - optionales data-testid (z.B. Backlog `page-title`)
 * @param {keyof JSX.IntrinsicElements} [props.as='h1'] - Heading-Element
 * @param {string} [props.className] - zusätzliche Klassen (Spacing etc.)
 */
export default function PageTitle({
  children,
  leadingIcon,
  suffix,
  dataTestid,
  as: As = 'h1',
  className = '',
  ...rest
}) {
  const base = 'm-0 font-display text-2xl font-bold text-[var(--text)]'
  // Ohne Icon trägt das Heading selbst die extra-className (Spacing); mit Icon
  // wandert sie auf die Flex-Row (siehe unten).
  const headingClass = leadingIcon == null && className ? `${base} ${className}` : base

  const heading = (
    <As
      className={headingClass}
      {...(dataTestid != null ? { 'data-testid': dataTestid } : {})}
      {...rest}
    >
      {children}
      {suffix != null && (
        <span className="font-normal text-[var(--subtext0)]">{suffix}</span>
      )}
    </As>
  )

  if (leadingIcon == null) return heading

  // Mit Icon: Flex-Row (gap-3 = 12px, 4px-Grid). data-ui/rest bleibt am Heading.
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      {leadingIcon}
      {heading}
    </div>
  )
}
