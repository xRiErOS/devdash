/**
 * GF-2 A0b (Q01) — SprintReviewRollup (05.30 Widgets). Kompakter Review-Rollup für den
 * Sprint-Detail: 3 Metriken (offen/bestanden/abgelehnt) + Nav „Review öffnen". Speist
 * den `entity-detail.slot.review`-Slot (R-Spalte) der SprintDetails-Komposition.
 *
 * Präsentational/controlled: `metrics` + `onOpenReview` vom Consumer. Echte Zahlen ab
 * Wave D (Completeness-Endpoint, D-L); bis dahin Fixtures (D-F).
 *
 * DSN-B01 (WCAG): Metrik-ZAHL in `--text` (AA-sicher beide Themes), Ton NUR im Dot
 * (Akzent als bg, dekorativ) — kein voll-Ton-Text/tint-bg (failt Latte-AA).
 */
import SprintReviewRollup from '../../../components/ui/organisms/SprintReviewRollup.jsx'

const noop = () => {}

const meta = {
  title: '05 ORGANISMS/05.30 Widgets/SprintReviewRollup',
  component: SprintReviewRollup,
  tags: ['status:stable', 'qa_behavioral:open', 'design_version:v2'],
  parameters: { layout: 'padded' },
  argTypes: {
    heading: { control: 'text' },
    loading: { control: 'boolean' },
  },
  args: {
    heading: 'Review',
    metrics: { open: 2, passed: 6, rejected: 1 },
    loading: false,
  },
}
export default meta

// Default (BaseStory): args-getrieben (autodocs-Primary) — self-titled „Review", befüllt.
export const Default = {
  args: { heading: undefined, metrics: undefined, loading: false },
  render: (args) => (
    <div data-ui="organism.sprint-review-rollup.default" className="max-w-xs">
      <SprintReviewRollup {...args} onOpenReview={noop} />
    </div>
  ),
}

// Main: maßgeblicher Hauptfall — Sprint in Review, 2 offen / 6 bestanden / 1 abgelehnt.
export const Main = {
  render: () => (
    <div data-ui="organism.sprint-review-rollup.main" className="max-w-xs">
      <SprintReviewRollup heading="Review" metrics={{ open: 2, passed: 6, rejected: 1 }} onOpenReview={noop} />
    </div>
  ),
}

// State_Empty: Sprint ohne Review-Bewegung → alle Zähler 0 (kein Crash, Default-Destructure).
export const State_Empty = {
  render: () => (
    <div data-ui="organism.sprint-review-rollup.empty" className="max-w-xs">
      <SprintReviewRollup heading="Review" metrics={{ open: 0, passed: 0, rejected: 0 }} onOpenReview={noop} />
    </div>
  ),
}

// State_Loading: Metriken async (bis Wave-D-Completeness) → Skeleton (aria-busy), A11Y-Q02.
export const State_Loading = {
  render: () => (
    <div data-ui="organism.sprint-review-rollup.loading" className="max-w-xs">
      <SprintReviewRollup heading="Review" loading onOpenReview={noop} />
    </div>
  ),
}
