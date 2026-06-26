/**
 * EmptyState — Leerzustand einer Liste, zwei Varianten (Spec §7). Reines
 * Präsentations-Atom, props-driven. Icon über Registry (`backlog` = Inbox),
 * CTA über das `Button`-Atom. Kein Store/Fetch.
 *
 * - `empty`    → 0 Elemente im Projekt: Headline + primärer CTA (Issue anlegen).
 * - `no-match` → Filter ergibt 0 Treffer: Headline + Ghost-CTA (Filter zurücksetzen).
 * - `error`    → Laden fehlgeschlagen: Danger-Glyph + Retry-CTA (Connected-Wrapper).
 *
 * @param {object} props
 * @param {'empty'|'no-match'|'error'} [props.variant='empty']
 * @param {()=>void} [props.onAction] - Klick auf den CTA
 * @param {string} [props.dataUiScope='atom.emptyState']
 * @param {string} [props.className]
 */
import Icon from '../foundations/Icon.jsx'
import Button from './Button.jsx'

const COPY = {
  empty: {
    headline: 'Noch nichts hier',
    sub: 'Dieses Projekt hat noch keine Elemente.',
    cta: 'Erstes Issue anlegen',
    variant: 'primary',
    iconName: 'add',
    glyph: 'backlog',
  },
  'no-match': {
    headline: 'Kein Element passt',
    sub: 'Die aktiven Filter ergeben keinen Treffer.',
    cta: 'Filter zurücksetzen',
    variant: 'ghost',
    iconName: 'reset',
    glyph: 'backlog',
  },
  error: {
    headline: 'Laden fehlgeschlagen',
    sub: 'Die Daten konnten nicht geladen werden.',
    cta: 'Erneut versuchen',
    variant: 'ghost',
    iconName: 'reset',
    glyph: 'alert',
    glyphRole: 'danger',
  },
}

export default function EmptyState({ variant = 'empty', onAction, dataUiScope = 'atom.emptyState', className = '' }) {
  const c = COPY[variant] || COPY.empty
  // error-Glyph trägt die Danger-Rolle (Token-Farbe), die neutralen Varianten bleiben mono.
  const glyphProps = c.glyphRole ? { role: c.glyphRole } : { mono: true }
  return (
    <div
      data-ui={dataUiScope}
      className={`flex flex-col items-center justify-center text-center gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-6)] ${className}`}
    >
      <Icon name={c.glyph} size={40} {...glyphProps} />
      <div data-ui={`${dataUiScope}.headline`} className="[font-family:var(--font-display)] text-[15px] font-bold text-[var(--text)]">
        {c.headline}
      </div>
      <div data-ui={`${dataUiScope}.sub`} className="text-[12px] text-[var(--subtext0)] max-w-[36ch]">
        {c.sub}
      </div>
      <Button variant={c.variant} iconName={c.iconName} onClick={onAction} dataUiScope={`${dataUiScope}.cta`}>
        {c.cta}
      </Button>
    </div>
  )
}
