/**
 * Kbd — Atom (03.20 Display). Tastatur-Shortcut-Anzeige (keyboard-first).
 * Natives <kbd>-Element: mono, getönte Fläche (--surface1), feine Border
 * (--surface2), gerundet, klein. Für Kombos (z.B. ⌘+S) mehrere <Kbd>
 * nebeneinander setzen (das Trennzeichen liegt beim Aufrufer). Props-driven,
 * token-clean (0 inline-style, 0 Raw-Hex).
 *
 * @param {object} props
 * @param {import('react').ReactNode} [props.children] - Tasten-Glyph(en), z.B. 'S', '⌘', 'Esc'
 * @param {'sm'|'md'} [props.size='md'] - Anzeigegröße
 * @param {string} [props.className] - zusätzliche Klassen
 */

const SIZE = {
  sm: 'text-[10px] min-w-[16px] h-[16px] px-1',
  md: 'text-[11px] min-w-[20px] h-[20px] px-1.5',
}

export default function Kbd({ children, size = 'md', className = '', ...rest }) {
  const sizeClasses = SIZE[size] || SIZE.md
  return (
    <kbd
      data-ui="kbd"
      className={`inline-flex items-center justify-center font-mono font-medium leading-none rounded border-[1px] border-[var(--surface2)] bg-[var(--surface1)] text-[var(--subtext0)] ${sizeClasses} ${className}`}
      {...rest}
    >
      {children}
    </kbd>
  )
}
