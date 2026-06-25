/**
 * StickyActionBar — kanonische, token-saubere Variante (DD-56 Harvest).
 * Sticky Bottom-Bar fuer Edit-Forms: blur-Background + border-top, justify-end.
 * Props-driven, kein Store/Fetch, keine Domänen-Begriffe.
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children] - Action-Buttons (rechtsbündig)
 * @param {string} [props.insetX='mx-0'] - horizontaler Inset (z.B. '-mx-4')
 * @param {string} [props.className] - zusätzliche Klassen
 */
export default function StickyActionBar({ children, className = '', insetX = 'mx-0', ...rest }) {
  return (
    <div
      data-ui="sticky-action-bar"
      className={`sticky bottom-0 left-0 right-0 ${insetX} px-4 pt-3 pb-safe-bar mt-5 flex items-center justify-end gap-2 border-t border-[var(--surface2)] backdrop-blur-[6px] bg-[color-mix(in_srgb,var(--surface1)_92%,transparent)] ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
