// src/components/ui/layout/Grid.jsx
import { gapClass } from './gap.js'
/**
 * Grid — responsives Auto-Fit-Raster (Every Layout). Spaltenzahl ergibt sich
 * aus min-Spaltenbreite; kein Breakpoint-Gefummel.
 * @param {object} props
 * @param {string} [props.min='14rem'] - minimale Spaltenbreite (rem, kein px)
 * @param {'none'|'xs'|'sm'|'md'|'lg'} [props.gap='md']
 */
export default function Grid({ min = '14rem', gap = 'md', className = '', children, ...rest }) {
  return (
    <div
      className={`grid ${gapClass(gap)} ${className}`}
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))` }}
      {...rest}
    >
      {children}
    </div>
  )
}
