/**
 * Input — Atom (kanonisch, token-clean). Harvest aus components/ui/Input.jsx.
 * Ersetzt die ~30× kopierte className `rounded-lg px-3 py-2 border-0 outline-none`.
 *
 * Token-clean: 0 inline-style, 0 Raw-Hex. Farben via Tailwind-v4-Arbitrary-Tokens.
 * font-size 16px (text-base) gegen iOS-Zoom beibehalten.
 *
 * @param {object} props
 * @param {React.ReactNode} [props.leadingIcon] - z.B. Lucide-Search links eingebettet
 * @param {'surface0'|'transparent'|'bordered'} [props.surface='surface0'] - Flächen-Tone.
 *   surface0 = gefüllt (Default). transparent = keine Fläche (für Action-Leisten,
 *   harmoniert mit ghost-Triggern). bordered = transparent + Rahmen (Input-Affordanz
 *   ohne Graufüllung).
 * @param {string} [props.className] - zusätzliche Klassen am input
 * @param {string} [props.value]
 * @param {(e:any)=>void} [props.onChange]
 * @param {boolean} [props.disabled]
 * @param {string} [props.placeholder]
 */
const SURFACE = {
  surface0: 'border-0 bg-[var(--surface0)]',
  transparent: 'border-0 bg-transparent',
  bordered: 'border border-[var(--surface1)] bg-transparent',
}

export default function Input({ leadingIcon, surface = 'surface0', className = '', ...rest }) {
  const field = (
    <input
      data-ui="input"
      className={`w-full rounded-lg px-3 py-2 outline-none text-base text-[var(--text)] disabled:opacity-50 disabled:cursor-not-allowed ${SURFACE[surface] || SURFACE.surface0} ${leadingIcon ? 'pl-9' : ''} ${className}`}
      {...rest}
    />
  )
  if (!leadingIcon) return field
  return (
    <div className="relative flex items-center">
      <span data-ui="input.icon" className="absolute left-2.5 flex items-center text-[var(--subtext0)]">
        {leadingIcon}
      </span>
      {field}
    </div>
  )
}
