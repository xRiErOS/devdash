// src/components/ui/layout/Stack.jsx
import { gapClass } from './gap.js'
/**
 * Stack — vertikale Anordnung (Every Layout). Content-agnostisch.
 * @param {object} props
 * @param {'none'|'xs'|'sm'|'md'|'lg'} [props.gap='md']
 * @param {'start'|'center'|'end'|'stretch'} [props.align='stretch']
 */
export default function Stack({ gap = 'md', align = 'stretch', as: As = 'div', className = '', children, ...rest }) {
  const alignClass = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' }[align] || 'items-stretch'
  return (
    <As className={`flex flex-col ${alignClass} ${gapClass(gap)} ${className}`} {...rest}>
      {children}
    </As>
  )
}
