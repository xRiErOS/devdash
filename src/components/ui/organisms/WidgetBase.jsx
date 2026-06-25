import WidgetHeading from '../molecules/WidgetHeading.jsx'

// GF-2 WidgetBase E1 — WidgetBase (organism). Wiederverwendbare Widget-Shell:
// Layer-3-Fill (--layer-3 = surface0) + --border + Radius, self-titled WidgetHeading
// (Dot + heading-accent + hover-reveal Actions), Bausteine (Layer-4) als children.
// EINZIGE Fill-Quelle der Widget-Schicht (Anti-Drift, D-QC1). `group` trägt den
// Hover-Reveal-Kontext der Heading-Actions.
export default function WidgetBase({ heading, action, children, className = '', dataUi = 'widget-base' }) {
  return (
    <div
      data-ui={dataUi}
      className={`group rounded-[9px] border border-[var(--border)] bg-[var(--layer-3)] p-[14px_16px_16px] ${className}`}
    >
      {heading != null && <WidgetHeading heading={heading} action={action} dataUi={`${dataUi}.heading`} />}
      <div data-ui={`${dataUi}.content`}>{children}</div>
    </div>
  )
}
