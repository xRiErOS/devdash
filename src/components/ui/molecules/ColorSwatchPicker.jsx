import Icon from '../../../storybook/01-foundations/01.20-iconography/Icon.jsx'
import Button from '../atoms/Button.jsx'

/**
 * ColorSwatchPicker — Molecule (04.10 Form, GF-2 G2). Präsentationaler
 * Projekt-Akzentfarben-Picker: eine ARIA-Radiogroup aus wählbaren Farb-Swatches.
 * Eltern halten den State (controlled) — diese Einheit rendert nur und meldet die
 * Auswahl via `onChange(key)` zurück (CONV-molecule-boundary: kein eigener State,
 * kein Fetch). Konsument: ProjectCreate / ProjectSettings.
 *
 * Canon R11 (keine rohen interaktiven Primitive in einem Molecule): jeder Swatch
 * wird aus dem Button-Atom komponiert (NICHT rohes <button>). Die Farbe selbst ist
 * CONTENT (die wählbare Akzentfarbe), gezeigt über ein inneres Element mit
 * `bg-[var(<token>)]` — das ist die semantische Wahl-Farbe, keine Layout-Fläche
 * (R14 betrifft Layer-Flächen, nicht diese Wahl-Farbe). role/aria-checked/data-ui/
 * onClick werden durch das Atom (`...rest`) auf das <button> durchgereicht.
 *
 * Token-sauber: keine inline-styles, keine Roh-Hex. Farbe via `var(--token)` /
 * Tailwind-Arbitrary `bg-[var(--token)]`. Der gewählte Swatch zeigt einen Ring +
 * Check-Icon (Registry `success`), sonst kein Check.
 *
 * data-ui: Wurzel `color-swatch-picker`; je Swatch `color-swatch-picker.swatch-<key>`;
 * Check (nur am gewählten Swatch) `color-swatch-picker.swatch-<key>.check`.
 *
 * @param {object} props
 * @param {Array<{key: string, token: string}>} [props.colors] - wählbare Akzente
 *   (token = CSS-Custom-Property-Name, z.B. `{ key: 'blue', token: '--blue' }`).
 * @param {string} [props.value] - gewählter Key (controlled).
 * @param {(key: string) => void} [props.onChange] - bei Auswahl gefeuert.
 * @param {string} [props.name='project-color'] - Radiogroup-Name.
 * @param {string} [props.ariaLabel='Projektfarbe'] - aria-label der Gruppe.
 * @param {boolean} [props.disabled=false] - deaktiviert die ganze Gruppe.
 * @param {string} [props.className]
 */

// Default-Set: Catppuccin-Akzente, die als :root-Tokens in src/index.css existieren
// (geprüft 2026-06-24 — `pink/rosewater/flamingo/maroon/sky` existieren NICHT als
// Token; `sapphire` ersetzt das angefragte pink). ~8 sinnvolle, gut unterscheidbare
// Akzente. Erster Key = blue (Ref-Test-Anker).
export const DEFAULT_COLORS = [
  { key: 'blue', token: '--blue' },
  { key: 'green', token: '--green' },
  { key: 'peach', token: '--peach' },
  { key: 'mauve', token: '--mauve' },
  { key: 'red', token: '--red' },
  { key: 'teal', token: '--teal' },
  { key: 'yellow', token: '--yellow' },
  { key: 'sapphire', token: '--sapphire' },
]

// Literale Token→Swatch-Fill-Map (Tailwind-JIT scannt nur literale Strings; ein
// Runtime-`bg-[var(${token})]` würde nicht generiert). Deckt das Default-Set ab.
const FILL = {
  '--blue': 'bg-[var(--blue)]',
  '--green': 'bg-[var(--green)]',
  '--peach': 'bg-[var(--peach)]',
  '--mauve': 'bg-[var(--mauve)]',
  '--red': 'bg-[var(--red)]',
  '--teal': 'bg-[var(--teal)]',
  '--yellow': 'bg-[var(--yellow)]',
  '--sapphire': 'bg-[var(--sapphire)]',
  '--lavender': 'bg-[var(--lavender)]',
}

export default function ColorSwatchPicker({
  colors = DEFAULT_COLORS,
  value,
  onChange,
  name = 'project-color',
  ariaLabel = 'Projektfarbe',
  disabled = false,
  className = '',
  ...rest
}) {
  return (
    <div
      data-ui="color-swatch-picker"
      role="radiogroup"
      aria-label={ariaLabel}
      data-name={name}
      className={`flex flex-wrap items-center gap-2 ${className}`}
      {...rest}
    >
      {colors.map(({ key, token }) => {
        const selected = value === key
        const fill = FILL[token] || 'bg-[var(--surface1)]'
        return (
          <Button
            key={key}
            variant="ghost"
            size="md"
            disabled={disabled}
            onClick={() => onChange?.(key)}
            role="radio"
            aria-checked={selected}
            aria-label={key}
            data-ui={`color-swatch-picker.swatch-${key}`}
            className={`!h-9 !w-9 !p-0 rounded-full ${
              selected
                ? 'ring-2 ring-[var(--focus-ring)] ring-offset-2 ring-offset-[var(--base)]'
                : 'ring-1 ring-[var(--border)]'
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full ${fill}`}
            >
              {selected && (
                <span data-ui={`color-swatch-picker.swatch-${key}.check`}>
                  <Icon name="success" mono size={14} />
                </span>
              )}
            </span>
          </Button>
        )
      })}
    </div>
  )
}
