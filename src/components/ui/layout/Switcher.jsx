// src/components/ui/layout/Switcher.jsx
import { gapClass } from './gap.js'

// GF-226 (D10-B): Reflow-Schwelle token-gebunden an die --cq-*-Skala (GF-228/D01).
// Every-Layout-Switcher-Technik — intrinsischer flex-basis-calc-Trick statt
// Viewport-Media ODER CSS-container-query: `var()` ist in container-/media-Feature-
// Conditions spec-verboten, im calc() aber erlaubt. Liegt der Container breiter als
// die Schwelle → eine Reihe; darunter → jede Spalte volle Breite (Stack). Statische
// Klassen-Map (wie Pill), damit der Tailwind-JIT die Werte sieht und 0 inline-style
// entsteht. [&>*] adressiert die direkten Kinder ohne Wrapper-Element.
const THRESHOLD = {
  sm: '[&>*]:basis-[calc((var(--cq-sm)-100%)*999)]',
  md: '[&>*]:basis-[calc((var(--cq-md)-100%)*999)]',
  lg: '[&>*]:basis-[calc((var(--cq-lg)-100%)*999)]',
}

/**
 * Switcher — kippt zwischen horizontaler Reihe und vertikalem Stack, sobald der
 * CONTAINER (nicht der Viewport) die Schwelle unterschreitet. Komponenten-lokal,
 * intrinsisch (Every Layout). Für Toolbars/Action-Paare/Filterzeilen.
 * @param {object} props
 * @param {'sm'|'md'|'lg'} [props.threshold='sm'] - Schwelle aus der --cq-*-Skala (480/768/1024)
 * @param {'none'|'xs'|'sm'|'md'|'lg'} [props.gap='sm']
 */
export default function Switcher({ threshold = 'sm', gap = 'sm', className = '', children, ...rest }) {
  const t = THRESHOLD[threshold] || THRESHOLD.sm
  return (
    <div className={`flex flex-wrap ${gapClass(gap)} [&>*]:grow ${t} ${className}`} {...rest}>
      {children}
    </div>
  )
}
