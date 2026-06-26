/* _mockups/mockup-kit.jsx — Sandbox-Helfer für die Root-Entwürfe.
 * Region setzt data-ui = Kurz-Code (a1, b4, c3 …) UND rendert einen sichtbaren
 * Chip, damit der PO jedes Element 1:1 ansprechen kann ("a1, b4, c3 gefallen").
 * Sichtbarkeit der Chips global via Ancestor-Klasse .mk-codes-on/off (CSS),
 * kein Prop-Threading. Reines Präsentations-Mockup, SSR-rein. */
import './mockup-root.css'

export function Region({ code, label, corner = 'tl', as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag className={`mk-region ${className}`} data-ui={code} {...rest}>
      {code ? (
        <span className={`mk-code mk-code--${corner}`} aria-hidden="true">
          <b>{code}</b>
          {label ? <span className="mk-code__label">{label}</span> : null}
        </span>
      ) : null}
      {children}
    </Tag>
  )
}

/** Shell-Wrapper: setzt die Code-Sichtbarkeit (showCodes-Arg) + Konzept-Klasse. */
export function Shell({ variant, showCodes = true, children }) {
  return (
    <div className={`mk mk-${variant} ${showCodes ? 'mk-codes-on' : 'mk-codes-off'}`}>
      {children}
    </div>
  )
}
