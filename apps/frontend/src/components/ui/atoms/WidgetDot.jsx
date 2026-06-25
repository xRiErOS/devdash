// GF-2 WidgetBase E1 — WidgetDot (atom, Layer-5).
// Heading-accent-Marker (7px) für Slot-Headings. Trägt die stehende Akzent-Rolle
// grafisch (Dot ≥3:1), damit der Titel-Text die Farbe NICHT allein tragen muss.
export default function WidgetDot({ className = '', dataUi = 'atom.widget-dot' }) {
  return (
    <span
      data-ui={dataUi}
      aria-hidden
      className={`inline-block h-[7px] w-[7px] flex-none rounded-[2px] bg-[var(--heading-accent)] ${className}`}
    />
  )
}
