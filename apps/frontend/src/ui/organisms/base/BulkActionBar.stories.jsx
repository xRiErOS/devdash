/**
 * BulkActionBar — fixierte Massen-Aktionsleiste (Spec §6). Achsen: Sichtbarkeit
 * (Selektion > 0) und das offene Aktionsmenü (`openAction`). `fixed bottom-0` ->
 * im Story-Canvas am Viewport-Fuß; die Menüs öffnen nach oben (`bottom-full`).
 */
import BulkActionBar from './BulkActionBar.jsx'

const meta = {
  title: '04 ORGANISMS/BulkActionBar',
  component: BulkActionBar,
  tags: ['status:review', 'qa_behavioral:n/a'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    count: { control: { type: 'number' } },
    openAction: { control: { type: 'select' }, options: [null, 'status', 'priority', 'sprint', 'delete'] },
  },
  args: { count: 3 },
}
export default meta

// Genug Höhe, damit die nach oben öffnenden Menüs im Canvas sichtbar sind.
const Frame = ({ children, label }) => (
  <div className="relative h-[320px] bg-[var(--base)]">
    {label && <div className="p-[var(--space-4)] text-[12px] text-[var(--subtext0)]">{label}</div>}
    {children}
  </div>
)

export const Visible = {
  args: { count: 3 },
  render: (args) => (
    <Frame label="Leiste eingeblendet (Selektion > 0). Tab erreicht die Aktionen, Enter/Space öffnet das Menü.">
      <BulkActionBar {...args} />
    </Frame>
  ),
}

export const Hidden = {
  args: { count: 0 },
  render: (args) => (
    <Frame label="Selektion leer -> Leiste slidet aus (translate-y-full).">
      <BulkActionBar {...args} />
    </Frame>
  ),
}

export const StatusMenu = {
  args: { count: 3, openAction: 'status' },
  render: (args) => (
    <Frame label="Status-Menü offen: Lifecycle-Werte -> onAction('status', key).">
      <BulkActionBar {...args} />
    </Frame>
  ),
}

export const PriorityMenu = {
  args: { count: 3, openAction: 'priority' },
  render: (args) => (
    <Frame label="Priorität-Menü offen: P1–P4. Hinweis im Menü — set_priority fehlt serverseitig (I01).">
      <BulkActionBar {...args} />
    </Frame>
  ),
}

export const SprintMenu = {
  args: { count: 3, openAction: 'sprint' },
  render: (args) => (
    <Frame label="Sprint-Menü offen: Sprints + „Aus Sprint nehmen“ -> onAction('sprint', key).">
      <BulkActionBar {...args} />
    </Frame>
  ),
}

export const DeleteConfirm = {
  args: { count: 3, openAction: 'delete' },
  render: (args) => (
    <Frame label="Lösch-Bestätigung (Soft-Delete -> cancelled). Abbrechen/Esc bricht ab; Löschen -> onAction('delete').">
      <BulkActionBar {...args} />
    </Frame>
  ),
}
