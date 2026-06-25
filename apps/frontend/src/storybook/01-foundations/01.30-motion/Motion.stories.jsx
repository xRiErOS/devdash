/**
 * GF-214 — 01 FOUNDATIONS / 01.30 Motion.
 * Spiegelt die Motion-Tokens (index.css, Master) + zeigt die Interaktions-States
 * live am Button (Press + Focus-Ring). Spec: project_memory D-motion-spec, mem 395.
 * Hover über eine Spur demonstriert die jeweilige Dauer/Kurve. 0 inline-style/Hex.
 */
import './motion.css'
import Button from '../../../components/ui/atoms/Button.jsx'

const meta = {
  title: '01 FOUNDATIONS/01.30 Motion/Motion',
  // Reife folgt PO-Verdict: alle 3 Exports ok, Tier-01-Gate PASS 2026-06-16.
  tags: ['status:stable', 'qa_behavioral:n/a'],
  parameters: { layout: 'padded' },
}
export default meta

function Track({ label, mod }) {
  return (
    <div className="motion-row" data-ui={`fnd.motion.${mod}`}>
      <span className="motion-label">{label}</span>
      <div className="motion-track"><div className={`motion-bar motion-bar--${mod}`} /></div>
    </div>
  )
}

// Default = Dauer-Skala (Baseline-Showcase).
export const Default = {
  name: 'Durations',
  render: () => (
    <div className="motion-grid" data-ui="fnd.motion.durations">
      <Track label="fast · 120ms" mod="fast" />
      <Track label="base · 180ms" mod="base" />
      <Track label="slow · 280ms" mod="slow" />
    </div>
  ),
}

// Easing: standard (dezeleriert) vs emphasized (betont) — beide slow-Dauer.
export const Easing = {
  render: () => (
    <div className="motion-grid" data-ui="fnd.motion.easing">
      <Track label="ease-standard" mod="slow" />
      <Track label="ease-emphasized" mod="emphasized" />
    </div>
  ),
}

// Interaktions-States live: Press (active:scale) + Focus-Ring (Tab) am Button.
export const Interaction = {
  render: () => (
    <div className="flex flex-col gap-2" data-ui="fnd.motion.interaction">
      <span className="text-[11px] text-[var(--subtext0)] font-mono">Klick = Press (scale) · Tab = Focus-Ring (--focus-ring)</span>
      <div className="flex gap-2">
        <Button data-ui="fnd.motion.press">Press / Tab</Button>
        <Button variant="danger" data-ui="fnd.motion.press-danger">Danger</Button>
      </div>
    </div>
  ),
}
