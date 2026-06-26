// src/components/ui/layout/Cluster.jsx
import { gapClass } from './gap.js'
/**
 * Cluster — horizontale Gruppe, umbrechend (Every Layout). Für Toolbars,
 * Pill-Reihen, Action-Gruppen (Pattern P02/P10).
 * @param {object} props
 * @param {'none'|'xs'|'sm'|'md'|'lg'} [props.gap='sm']
 * @param {'start'|'between'|'end'|'center'} [props.justify='start']
 */
export default function Cluster({ gap = 'sm', justify = 'start', className = '', children, ...rest }) {
  const j = { start: 'justify-start', between: 'justify-between', end: 'justify-end', center: 'justify-center' }[justify] || 'justify-start'
  return (
    <div className={`flex flex-wrap items-center ${j} ${gapClass(gap)} ${className}`} {...rest}>
      {children}
    </div>
  )
}
