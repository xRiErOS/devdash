import { ExternalLink, Gem } from 'lucide-react'

/**
 * Link — Atom (03.10 Inputs). Styled Navigations-Link auf nativem `<a href>`.
 * Token-sauber (0 inline-style, 0 Roh-Hex). Props-driven, kein Store.
 *
 * `external` öffnet in neuem Tab (`target=_blank` + `rel=noopener noreferrer`)
 * und hängt ein ExternalLink-Indikator-Icon an (aria-hidden — die Bedeutung
 * trägt der Link-Text). Default-Farbe = `--accent-info`, hover unterstreicht.
 *
 * `obsidian` kennzeichnet einen Link auf eine Obsidian-URI (`obsidian://…`) mit
 * einem Gem-Indikator-Icon (analog zur external-Affordance) und übernimmt das
 * external-Hardening (neues Tab + `rel=noopener noreferrer`), da Obsidian-URIs
 * den Browser-Kontext verlassen.
 *
 * @param {object} props
 * @param {string} props.href - Ziel-URL (nativ).
 * @param {boolean} [props.external=false] - neues Tab + rel-Hardening + Extern-Icon.
 * @param {boolean} [props.obsidian=false] - Obsidian-URI-Kennung (Gem-Icon) + rel-Hardening.
 * @param {'default'|'muted'} [props.variant='default'] - Akzent vs. gedämpft.
 * @param {React.ReactNode} props.children - Link-Text.
 * @param {string} [props.className]
 */
const VARIANT = {
  default: 'text-[var(--accent-info)]',
  muted: 'text-[var(--subtext0)]',
}

export default function Link({
  href,
  external = false,
  obsidian = false,
  variant = 'default',
  children,
  className = '',
  ...rest
}) {
  const hardened = external || obsidian
  const hardenAttrs = hardened
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <a
      href={href}
      data-ui="link"
      className={`inline-flex items-center gap-1 hover:underline transition-colors duration-[var(--duration-fast)] ease-standard focus-visible:outline-none focus-visible:underline ${VARIANT[variant] || VARIANT.default} ${className}`}
      {...hardenAttrs}
      {...rest}
    >
      {children}
      {external && <ExternalLink size={14} aria-hidden className="shrink-0" />}
      {obsidian && <Gem size={14} aria-hidden className="shrink-0" />}
    </a>
  )
}
