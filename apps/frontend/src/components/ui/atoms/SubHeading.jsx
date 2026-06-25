// GF-2 WidgetBase E1 — SubHeading (atom). Baustein-Label im Widget (Layer-4-Sektion).
// Teal Sub-Akzent + Dot, KEIN ///-Slash (D-C, CommentLabel-Nachfolger).
// Farbe = --subheading-accent (D-SH, PO 2026-06-20): Latte gehärtetes Dunkel-Teal
// (AA auf surface0/surface1), Dark = pastell teal. WCAG-Veto RS-07 erfüllt.
export default function SubHeading({ children, className = '', dataUi = 'atom.sub-heading' }) {
  return (
    <div data-ui={dataUi} className={`mt-3 mb-1 flex items-center gap-[6px] text-[12px] font-semibold ${className}`}>
      <span aria-hidden className="inline-block h-[6px] w-[6px] rounded-full bg-[var(--subheading-accent)]" />
      <span className="text-[var(--subheading-accent)]">{children}</span>
    </div>
  )
}
