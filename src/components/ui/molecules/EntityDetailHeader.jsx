/**
 * EntityDetailHeader — Molecule (04.40 Data Display). Read-Only-Kopf der EntityDetail V2
 * (Terminal): id + title links, MetaTag-Pills rechtsbündig, Goal als schlichte
 * Untertitel-Zeile direkt unter dem Titel (Titel + Goal sagen zusammen, was die Entität
 * tut — PO-#2/D02). KEIN DocstringBlock (side-stripe-Border + """-Delimiter, impeccable
 * ABSOLUTE BAN). KEINE Edit-Affordance. Komponiert MetaTag; trägt das semantische
 * <header>-Tag, das so aus dem Organism (EntityDetailBase) ausgelagert ist (GF-321-Guard).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.id - Entity-Key (z.B. DD-251).
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode} [props.goal] - Goal/Zweck als Untertitel-Zeile (optional).
 * @param {Array<{k: string, label?: string, value: import('react').ReactNode, tone?: string}>} [props.pills]
 * @param {'transparent'|'crust'|'mantle'|'base'} [props.background]
 * @param {'detail'|'page'} [props.size='detail'] - 'page' = groessere Titel-Stufe (Text-Hierarchie
 *   ueber einem darunterliegenden 'detail'-Header, z.B. Sprint-PageTitle ueber Issue-Header).
 * @param {import('react').ReactNode} [props.action] - optionaler Aktions-Slot rechts (z.B. Copy-Button).
 * @param {string} [props.className]
 */
import MetaTag from '../atoms/MetaTag.jsx'

const BG_MAP = {
  transparent: 'bg-transparent',
  crust: 'bg-[var(--crust)]',
  mantle: 'bg-[var(--mantle)]',
  base: 'bg-[var(--base)]',
}

export default function EntityDetailHeader({ id, title, goal, pills = [], background = 'mantle', size = 'detail', action, className = '', ...rest }) {
  const idClass = size === 'page' ? 'text-xl' : 'text-lg'
  const titleClass = size === 'page' ? 'text-2xl' : 'text-xl'
  const hasRight = pills.length > 0 || action != null
  return (
    <header
      data-ui="entity-detail-header"
      className={`rounded-[var(--radius-sm)] border border-[var(--border)] ${BG_MAP[background] ?? 'bg-[var(--mantle)]'} ${className}`}
      {...rest}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[var(--border)] px-4 py-3">
        <span className={`[font-family:var(--font-display)] ${idClass} font-bold text-[var(--accent-primary)]`}>{id}</span>
        <span className={`[font-family:var(--font-display)] ${titleClass} text-[var(--text)]`}>{title}</span>
        {hasRight ? (
          <span className="flex flex-wrap items-center gap-3 sm:ml-auto">
            {pills.map((p) => <MetaTag key={p.k} label={p.label || p.k} value={p.value} tone={p.tone} />)}
            {action}
          </span>
        ) : null}
        {goal ? <p data-ui="entity-detail.goal" className="w-full [font-family:var(--font-display)] text-sm text-[var(--subtext0)] mt-1">{goal}</p> : null}
      </div>
    </header>
  )
}
