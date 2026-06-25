/**
 * WireframeSlot — Atom (03.20 Display, NEU, FEAT-32 Wireframe-Replik). Präsentationaler
 * Low-Fi-Platzhalter zur 1:1-Reproduktion eines draw.io-Wireframes als Storybook-Story.
 * Schreibt den aus draw.io übernommenen `data-ui`-Anker SICHTBAR in die Box (Prop `anchor`)
 * und spiegelt ihn als `data-anchor`-Attribut (querybar). Der Atom-Eigen-Anker ist
 * `data-ui="wireframe-slot"` (default) oder der via `dataUiScope` übergebene Wert.
 *
 * Reines Display, props-driven, kein Store/Fetch. Positionierung (absolute Koordinaten)
 * kommt von außen via `className` — der Atom kennt nur sein Box-Aussehen.
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex. Farben/Border über Catppuccin-Tokens
 * (`var(--token)`), Maße/Position über Tailwind-v4-Arbitrary aus `className`.
 *
 * @param {object} props
 * @param {string} props.anchor - der draw.io-`data-ui`-Anker (sichtbar + als data-anchor).
 * @param {string} [props.label] - Widget-/Region-Name (fett).
 * @param {string} [props.scope] - Entitäts-Scope-Klammer, z.B. "[Issue · Sprint]".
 * @param {string|number} [props.flow] - Lese-Reihenfolge (Mobile-Flow) als Marker.
 * @param {string|number} [props.flowD] - Desktop-Flow-Reihenfolge als Marker.
 * @param {'slot'|'area'|'region'|'control'|'accent'|'text'} [props.tone='slot'] - Optik-Achse.
 * @param {string} [props.dataUiScope] - Überschreibt den default data-ui="wireframe-slot"-Anker
 *   (GF-345, per-tone-Adressierbarkeit in Varianten-Listen).
 * @param {string} [props.className] - Positionierung/Maße (Story), z.B. 'absolute left-[80px] …'.
 */
const TONE = {
  // dashed Platzhalter (Default) — Entity-Detail-Slots
  slot: 'border border-dashed border-[var(--overlay0)] bg-[var(--base)] text-[var(--subtext0)]',
  // dashed Gruppierungs-Fläche (area-left/area-right) — faint, kein Fill
  area: 'border border-dashed border-[var(--surface2)] text-[var(--overlay0)]',
  // solider App-Shell-Rahmen (Topbar/Rail/Content)
  region: 'border border-[var(--surface2)] bg-[var(--surface0)] text-[var(--subtext0)]',
  // kleines Control (Button/Icon-Slot)
  control: 'border border-[var(--surface2)] bg-[var(--surface1)] text-[var(--subtext0)]',
  // aktives/akzentuiertes Control
  accent: 'border border-[var(--lavender)] bg-[var(--surface0)] text-[var(--lavender)]',
  // reiner Text (Breadcrumb/Footnote) — links, randlos
  text: 'text-[var(--subtext0)]',
}

export default function WireframeSlot({
  anchor,
  label,
  scope,
  flow,
  flowD,
  tone = 'slot',
  dataUiScope,
  className = '',
  ...rest
}) {
  const skin = TONE[tone] || TONE.slot
  const hasFlow = flow != null || flowD != null
  const flowMark = [flowD, flow].filter((v) => v != null).join('/')
  const dataUi = dataUiScope || 'wireframe-slot'

  if (tone === 'text') {
    return (
      <div
        data-ui={dataUi}
        data-anchor={anchor || undefined}
        className={`flex items-center font-mono text-[10px] leading-tight ${skin} ${className}`}
        {...rest}
      >
        {label || anchor}
      </div>
    )
  }

  return (
    <div
      data-ui={dataUi}
      data-anchor={anchor || undefined}
      className={`flex flex-col items-center justify-center gap-0.5 overflow-hidden rounded p-1 text-center font-mono leading-tight break-all ${skin} ${className}`}
      {...rest}
    >
      {hasFlow && (
        <span className="text-[9px] text-[var(--overlay1)]">{flowMark}</span>
      )}
      {anchor && (
        <span className="text-[10px] text-[var(--lavender)]">{anchor}</span>
      )}
      {label && <span className="text-[11px] font-bold">{label}</span>}
      {scope && <span className="text-[10px] text-[var(--overlay1)]">{scope}</span>}
    </div>
  )
}
