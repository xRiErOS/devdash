// GF-2 WidgetBase E1 — WidgetField (organism-helper). Baustein-Container = Layer-4
// (--layer-4 = surface1). Hält die DetailsSection-Ebene konsistent über alle Widgets,
// statt 15× wiederholtem Field-Markup. Gestalt = IssueDetailsColorLadder `Field()`.
export default function WidgetField({ children, className = '', dataUi = 'widget-field' }) {
  return (
    <div
      data-ui={dataUi}
      className={`mt-[5px] max-w-[64ch] rounded-[7px] border border-[var(--border)] bg-[var(--layer-4)] px-[11px] py-[9px] text-[13.5px] leading-[1.55] text-[var(--text)] ${className}`}
    >
      {children}
    </div>
  )
}
