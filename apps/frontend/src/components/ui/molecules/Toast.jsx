import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import IconButton from '../atoms/IconButton.jsx'

/**
 * Toast — Molecule (04.50 Status, GF-2 P01). Präsentationale Einzel-Toast-Zeile:
 * führendes kind-Icon + Message + optionaler Dismiss-IconButton. Single-Source des
 * Feedback-Auftritts; mappt `kind` auf Icon-Rolle (Registry) + Akzent-Token.
 *
 * REIN präsentational (CONV-molecule-boundary): kein eigener State, kein Event-
 * Listening. Das window-CustomEvent `devd-toast` (src/lib/toast.js), das Einsammeln,
 * Auto-Dismiss (5s) und Stacking sind HOST-Sache (ToastHost). Darum
 * `qa_behavioral: n/a` — diese Einheit trägt keine Interaktionslogik.
 *
 * kind → Icon-Rolle (Registry) + Akzent-Token (linke Akzent-Kante):
 *   success → role success / var(--green)
 *   error   → role danger  / var(--red)
 *   info    → role info    / var(--surface1)
 * Fläche = semantischer Layer-Alias (var(--layer-2)); der Akzent sitzt auf der
 * border-s (Kind-Farbe), nicht als Flächen-Fill (Surface-Ebenen-Bindung R14).
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.message - Anzuzeigender Text.
 * @param {'success'|'error'|'info'} [props.kind='info'] - Toast-Variante.
 * @param {()=>void} [props.onDismiss] - gesetzt → Dismiss-Button sichtbar.
 * @param {string} [props.className]
 */

// kind → { Icon-Registry-Key, Icon-Rolle, statische Akzent-Kant-Klasse }. FIX
// (spiegelt src/lib/toast.js: success=var(--green), error=var(--red),
// info=var(--surface1)). Statische Literale (kein Runtime-Interpolat) → Tailwind-
// JIT sieht die Klassen; der Akzent sitzt auf der border-s, nicht als Flächen-Fill.
const KIND_MAP = {
  success: { icon: 'success', role: 'success', accent: 'border-s-[var(--green)]' },
  error: { icon: 'error', role: 'danger', accent: 'border-s-[var(--red)]' },
  info: { icon: 'info', role: 'info', accent: 'border-s-[var(--surface1)]' },
}

export default function Toast({ message, kind = 'info', onDismiss, className = '', ...rest }) {
  const { icon, role, accent } = KIND_MAP[kind] || KIND_MAP.info

  return (
    <div
      data-ui="toast"
      role="status"
      aria-live="polite"
      className={`flex items-start gap-2 rounded-lg border-s-2 bg-[var(--layer-2)] px-3 py-2 text-[var(--text)] shadow-md ${accent} ${className}`}
      {...rest}
    >
      <span data-ui="toast.icon" className="mt-0.5 shrink-0">
        <Icon name={icon} role={role} size={16} />
      </span>
      <span data-ui="toast.message" className="min-w-0 flex-1 text-sm leading-snug">
        {message}
      </span>
      {onDismiss && (
        <IconButton
          data-ui="toast.dismiss"
          icon={<Icon name="close" size={14} />}
          label="Schließen"
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="shrink-0"
        />
      )}
    </div>
  )
}
