/**
 * GF-213 — <Icon name role /> — die EINZIGE Art, ein Icon zu rendern (kein
 * roher lucide-react-Import außerhalb iconRegistry.js).
 *
 * Farbe folgt der Semantik-ROLLE (role → Token, ROLE_CLASS). Rolle pro Verwendung:
 *   <Icon name="brain" role="success" />  → grün
 *   <Icon name="brain" role="danger" />   → rot
 * Nicht-sanktionierte Rolle fällt auf den Default (roles[0]) zurück.
 *
 * data-ui = `icon.<name>.<role>` (PO spricht jedes Icon im Review 1:1 an).
 * Icon-only ist bedeutungstragend → `label`-Prop setzt aria-label; sonst
 * aria-hidden (Bedeutung trägt der begleitende Text, z.B. Button-Children).
 *
 * @param {object} props
 * @param {string} props.name - Registry-Key (z.B. 'add', 'arrow-right', 'brain')
 * @param {'neutral'|'primary'|'success'|'danger'|'warning'|'info'} [props.role]
 * @param {number} [props.size=16] - Kantenlänge px
 * @param {string} [props.label] - aria-label für Icon-only (sonst aria-hidden)
 * @param {boolean} [props.mono=false] - neutralisiert die Rolle: rendert in der
 *   Vordergrundfarbe (--text) statt im Rollen-Token. Für Kataloge/Shape-Ansichten,
 *   wo Semantik-Farben nur verwirren (PO 2026-06-15). data-ui = `icon.<name>`.
 * @param {boolean} [props.inherit=false] - erbt die Vordergrundfarbe des Eltern-
 *   Elements (`text-current`) statt eines Rollen-Tokens. Für Icons IN gefärbten
 *   Buttons (danger/primary), damit sie die on-accent-Textfarbe übernehmen und
 *   nicht im eigenen Rollen-Token kontrastarm werden (BAB-3). data-ui = `icon.<name>`.
 * @param {string} [props.className]
 */
import { resolveIcon, ROLE_CLASS } from './iconRegistry.js'

export default function Icon({ name, role, size = 16, label, mono = false, inherit = false, className = '', ...rest }) {
  const resolved = resolveIcon(name, role)
  if (!resolved) {
    if (typeof console !== 'undefined') console.warn(`[Icon] unbekannter Registry-Key: "${name}"`)
    return null
  }
  const { Cmp, appliedRole } = resolved
  const aria = label ? { 'aria-label': label } : { 'aria-hidden': true }
  const colorClass = inherit ? 'text-current' : mono ? 'text-[var(--text)]' : ROLE_CLASS[appliedRole]
  const dataUi = inherit || mono ? `icon.${name}` : `icon.${name}.${appliedRole}`
  return (
    <Cmp
      data-ui={dataUi}
      size={size}
      strokeWidth={2}
      className={`${colorClass} ${className}`}
      {...aria}
      {...rest}
    />
  )
}
